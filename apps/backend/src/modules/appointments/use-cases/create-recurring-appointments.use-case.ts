import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { DataSource, QueryFailedError, QueryRunner } from 'typeorm'
import {
  AppointmentResponseDto,
  CreateRecurringAppointmentsDto,
  CreateRecurringAppointmentsResponseDto,
  MAXIMUM_RECURRENCE_HORIZON_IN_DAYS,
  RECURRENCE_INTERVAL_IN_WEEKS,
  RecurringOccurrenceAvailability,
  RecurringOccurrencePreviewDto,
  UserRole,
} from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { DistributedLockService } from '../../../cache/distributed-lock.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IPatientsRepository } from '../../patients/repositories/patients.repository.interface'
import { AppointmentSeries } from '../entities/appointment-series.entity'
import { Appointment } from '../entities/appointment.entity'
import { IAppointmentSeriesRepository } from '../repositories/appointment-series.repository.interface'
import { IAppointmentsRepository } from '../repositories/appointments.repository.interface'
import {
  differenceInDays,
  getDayOfWeekFromDate,
  isOnRecurrenceGrid,
} from '../utils/recurrence.util'
import { resolveSpecialty } from '../utils/resolve-specialty.util'
import { DetailedSlotResolution, ResolveProfessionalSlotUseCase } from './resolve-professional-slot.use-case'

const SERIES_LOCK_TTL_IN_SECONDS = 20

@Injectable()
export class CreateRecurringAppointmentsUseCase extends BaseUseCase {
  private readonly logger = new Logger(CreateRecurringAppointmentsUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly appointmentSeriesRepository: IAppointmentSeriesRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly patientsRepository: IPatientsRepository,
    private readonly resolveProfessionalSlotUseCase: ResolveProfessionalSlotUseCase,
    private readonly cacheService: CacheService,
    private readonly distributedLockService: DistributedLockService,
  ) {
    super(dataSource)
  }

  async execute(
    dto: CreateRecurringAppointmentsDto,
    currentUser: ICurrentUser,
  ): Promise<CreateRecurringAppointmentsResponseDto> {
    const clinicId = currentUser.clinicId!

    let professional
    if (currentUser.role === UserRole.PROFESSIONAL) {
      professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
    } else {
      if (!dto.professionalId) {
        throw new UnprocessableEntityException('professionalId is required for admin')
      }
      professional = await this.professionalsRepository.findById(dto.professionalId, clinicId)
    }
    if (!professional) throw new NotFoundException('Professional not found')

    const chosenSpecialty = resolveSpecialty(
      professional.professionalSpecialties.map((link) => ({
        id: link.specialtyId,
        name: link.specialty.name,
      })),
      dto.specialtyId,
    )

    const patient = await this.patientsRepository.findById(dto.patientId, clinicId)
    if (!patient) throw new NotFoundException('Patient not found')

    const sortedDates = [...dto.dates].sort()
    const intervalInWeeks = RECURRENCE_INTERVAL_IN_WEEKS[dto.recurrenceInterval]
    this.assertDatesMatchTheRule(sortedDates, dto.startTime, intervalInWeeks)

    // Full re-validation outside the lock: cheap to do, and it turns the common
    // "something changed since the preview" case into one 409 listing every
    // problem date instead of a lock-then-fail round trip.
    const resolutions = await this.resolveAll(professional.id, clinicId, sortedDates, dto.startTime)

    const created = await this.createSeriesAtomically(
      dto,
      sortedDates,
      resolutions,
      professional.id,
      chosenSpecialty?.id ?? null,
      clinicId,
      currentUser.id,
      intervalInWeeks,
    )

    await this.invalidateCache(clinicId, professional.id)

    const [professionalName, patientName] = await Promise.all([
      this.fetchProfessionalName(professional.id),
      this.fetchPatientName(dto.patientId),
    ])

    return {
      seriesId: created.series.id,
      recurrenceInterval: dto.recurrenceInterval,
      dayOfWeek: created.series.dayOfWeek,
      startTime: dto.startTime,
      createdOccurrenceCount: created.appointments.length,
      appointments: created.appointments.map((appointment) =>
        this.toResponse(
          appointment,
          professionalName,
          patientName,
          chosenSpecialty?.name ?? null,
          created.appointments.length,
        ),
      ),
    }
  }

  /**
   * The client submits explicit dates, so the server has to prove they really are
   * the requested recurrence: same weekday, on the interval grid, inside the
   * horizon and in the future. Without this the batch endpoint would be a way to
   * book arbitrary dates in bulk.
   */
  private assertDatesMatchTheRule(sortedDates: string[], startTime: string, intervalInWeeks: number): void {
    const anchorDate = sortedDates[0]
    const anchorDayOfWeek = getDayOfWeekFromDate(anchorDate)

    if (sortedDates.some((date) => getDayOfWeekFromDate(date) !== anchorDayOfWeek)) {
      throw new UnprocessableEntityException('All dates must fall on the same weekday')
    }

    if (sortedDates.some((date) => !isOnRecurrenceGrid(anchorDate, date, intervalInWeeks))) {
      throw new UnprocessableEntityException('Dates do not match the requested recurrence interval')
    }

    const span = differenceInDays(anchorDate, sortedDates[sortedDates.length - 1])
    if (span > MAXIMUM_RECURRENCE_HORIZON_IN_DAYS) {
      throw new UnprocessableEntityException(
        `A series cannot span more than ${MAXIMUM_RECURRENCE_HORIZON_IN_DAYS} days`,
      )
    }

    const nowUtc = new Date()
    // Brazil is always UTC-3 (DST abolished in 2019), matching create-appointment.
    if (sortedDates.some((date) => new Date(`${date}T${startTime}:00-03:00`) <= nowUtc)) {
      throw new UnprocessableEntityException('Cannot book an appointment in the past')
    }
  }

  private async resolveAll(
    professionalId: string,
    clinicId: string,
    sortedDates: string[],
    startTime: string,
  ): Promise<Map<string, DetailedSlotResolution>> {
    const resolutions = new Map<string, DetailedSlotResolution>()
    const conflicts: RecurringOccurrencePreviewDto[] = []

    for (const date of sortedDates) {
      const resolution = await this.resolveProfessionalSlotUseCase.executeDetailed(
        professionalId,
        clinicId,
        date,
        startTime,
      )
      resolutions.set(date, resolution)

      if (resolution.availability !== RecurringOccurrenceAvailability.AVAILABLE) {
        conflicts.push({
          date,
          startTime,
          endTime: null,
          scheduleId: null,
          availability: resolution.availability,
          selectable: false,
        })
      }
    }

    if (conflicts.length > 0) throw this.conflict(conflicts)

    return resolutions
  }

  private async createSeriesAtomically(
    dto: CreateRecurringAppointmentsDto,
    sortedDates: string[],
    resolutions: Map<string, DetailedSlotResolution>,
    professionalId: string,
    specialtyId: string | null,
    clinicId: string,
    createdByUserId: string,
    intervalInWeeks: number,
  ): Promise<{ series: AppointmentSeries; appointments: Appointment[] }> {
    // One lock per (clinic, professional) rather than one per slot: nesting 26
    // Redis locks would be slow and impossible to release cleanly on a partial
    // acquisition. The partial unique index remains the real arbiter against a
    // concurrent single POST /appointments, which locks a different key space —
    // hence the 23505 handling below.
    const lockKey = `appointment:series:${clinicId}:${professionalId}`

    try {
      return await this.distributedLockService.runWithLock(lockKey, SERIES_LOCK_TTL_IN_SECONDS, () =>
        this.runInTransaction(async (queryRunner) => {
          await this.assertSlotsStillFree(professionalId, clinicId, sortedDates, dto.startTime, queryRunner)

          const series = await this.appointmentSeriesRepository.create(
            {
              clinicId,
              professionalId,
              patientId: dto.patientId,
              specialtyId,
              recurrenceInterval: dto.recurrenceInterval,
              dayOfWeek: getDayOfWeekFromDate(sortedDates[0]),
              startTime: dto.startTime,
              anchorDate: sortedDates[0],
              requestedOccurrenceCount: dto.occurrenceCount ?? null,
              requestedUntilDate: dto.untilDate ?? null,
              createdOccurrenceCount: sortedDates.length,
              createdByUserId,
            },
            queryRunner,
          )

          const appointments: Appointment[] = []
          // Ascending order keeps the insert sequence deterministic across
          // concurrent series, so two of them can never deadlock each other.
          for (const [index, date] of sortedDates.entries()) {
            const resolution = resolutions.get(date)!
            appointments.push(
              await this.appointmentsRepository.create(
                {
                  clinicId,
                  professionalId,
                  patientId: dto.patientId,
                  specialtyId,
                  scheduleId: resolution.scheduleId!,
                  date,
                  startTime: dto.startTime,
                  endTime: resolution.endTime!,
                  reason: dto.reason ?? null,
                  insuranceType: dto.insuranceType ?? null,
                  seriesId: series.id,
                  seriesSequence: index + 1,
                },
                queryRunner,
              ),
            )
          }

          return { series, appointments }
        }),
      )
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const pgError = error as QueryFailedError & { code?: string }
        if (pgError.code === '23505') {
          throw await this.conflictFromTakenSlots(professionalId, clinicId, sortedDates, dto.startTime)
        }
      }
      throw error
    }
    // The whole series is created or none of it is: "booked 8 of your 10 dates"
    // has no honest status code and would leave series_sequence with holes.
  }

  private async assertSlotsStillFree(
    professionalId: string,
    clinicId: string,
    sortedDates: string[],
    startTime: string,
    queryRunner: QueryRunner,
  ): Promise<void> {
    const taken = await this.appointmentsRepository.findActiveByDatesAndTime(
      professionalId,
      clinicId,
      sortedDates,
      startTime,
      queryRunner,
    )
    if (taken.length === 0) return

    throw this.conflict(
      taken.map((appointment) => ({
        date: appointment.date,
        startTime,
        endTime: null,
        scheduleId: null,
        availability: RecurringOccurrenceAvailability.ALREADY_BOOKED,
        selectable: false,
      })),
    )
  }

  private async conflictFromTakenSlots(
    professionalId: string,
    clinicId: string,
    sortedDates: string[],
    startTime: string,
  ): Promise<ConflictException> {
    // Re-read outside the rolled-back transaction rather than parsing
    // driverError.detail, which is brittle.
    const taken = await this.appointmentsRepository.findActiveByDatesAndTime(
      professionalId,
      clinicId,
      sortedDates,
      startTime,
    )

    return this.conflict(
      taken.map((appointment) => ({
        date: appointment.date,
        startTime,
        endTime: null,
        scheduleId: null,
        availability: RecurringOccurrenceAvailability.ALREADY_BOOKED,
        selectable: false,
      })),
    )
  }

  private conflict(conflictingOccurrences: RecurringOccurrencePreviewDto[]): ConflictException {
    return new ConflictException({
      message: 'Some of the requested dates are no longer available',
      conflictingOccurrences,
    })
  }

  private async invalidateCache(clinicId: string, professionalId: string): Promise<void> {
    try {
      await this.cacheService.delByPrefix(`appointments:list:${clinicId}:`)
      // Cuts at the professional, so every affected date is invalidated in one go.
      await this.cacheService.delByPrefix(`appointments:availability:${clinicId}:${professionalId}:`)
      await this.cacheService.delByPrefix(`dashboard:${clinicId}:`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: CreateRecurringAppointmentsUseCase.name })
    }
  }

  private async fetchProfessionalName(professionalId: string): Promise<string> {
    const rows: Array<{ fullName: string }> = await this.dataSource
      .createQueryBuilder()
      .select('u.full_name', 'fullName')
      .from('professionals', 'd')
      .innerJoin('users', 'u', 'u.id = d.user_id AND u.deleted_at IS NULL')
      .where('d.id = :professionalId', { professionalId })
      .andWhere('d.deleted_at IS NULL')
      .getRawMany()
    return rows[0]?.fullName ?? ''
  }

  private async fetchPatientName(patientId: string): Promise<string> {
    const rows: Array<{ fullName: string }> = await this.dataSource
      .createQueryBuilder()
      .select('u.full_name', 'fullName')
      .from('patients', 'p')
      .innerJoin('users', 'u', 'u.id = p.user_id AND u.deleted_at IS NULL')
      .where('p.id = :patientId', { patientId })
      .andWhere('p.deleted_at IS NULL')
      .getRawMany()
    return rows[0]?.fullName ?? ''
  }

  private toResponse(
    appointment: Appointment,
    professionalName: string,
    patientName: string,
    specialtyName: string | null,
    seriesTotalOccurrences: number | null,
  ): AppointmentResponseDto {
    return {
      id: appointment.id,
      professionalId: appointment.professionalId,
      professionalName,
      patientId: appointment.patientId,
      patientName,
      specialtyId: appointment.specialtyId,
      specialtyName,
      scheduleId: appointment.scheduleId,
      date: appointment.date,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status,
      insuranceType: appointment.insuranceType,
      reason: appointment.reason,
      cancellationReason: appointment.cancellationReason,
      seriesId: appointment.seriesId,
      seriesSequence: appointment.seriesSequence,
      seriesTotalOccurrences,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    }
  }
}
