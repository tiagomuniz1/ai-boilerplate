import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { DataSource, QueryFailedError } from 'typeorm'
import {
  AppointmentResponseDto,
  CreateAppointmentDto,
  RecurringOccurrenceAvailability,
  UserRole,
} from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { DistributedLockService } from '../../../cache/distributed-lock.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IPatientsRepository } from '../../patients/repositories/patients.repository.interface'
import { Appointment } from '../entities/appointment.entity'
import { IAppointmentsRepository } from '../repositories/appointments.repository.interface'
import { ResolveProfessionalSlotUseCase } from './resolve-professional-slot.use-case'

@Injectable()
export class CreateAppointmentUseCase extends BaseUseCase {
  private readonly logger = new Logger(CreateAppointmentUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly patientsRepository: IPatientsRepository,
    private readonly resolveProfessionalSlotUseCase: ResolveProfessionalSlotUseCase,
    private readonly cacheService: CacheService,
    private readonly distributedLockService: DistributedLockService,
  ) {
    super(dataSource)
  }

  async execute(dto: CreateAppointmentDto, currentUser: ICurrentUser): Promise<AppointmentResponseDto> {
    const clinicId = currentUser.clinicId!

    let professional
    if (currentUser.role === UserRole.PROFESSIONAL) {
      professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
    } else {
      if (!dto.professionalId) throw new UnprocessableEntityException('professionalId is required for admin')
      professional = await this.professionalsRepository.findById(dto.professionalId, clinicId)
    }
    if (!professional) throw new NotFoundException('Professional not found')

    const chosenSpecialty = this.resolveSpecialty(
      professional.professionalSpecialties.map((ds) => ({ id: ds.specialtyId, name: ds.specialty.name })),
      dto.specialtyId,
    )

    const patient = await this.patientsRepository.findById(dto.patientId, clinicId)
    if (!patient) throw new NotFoundException('Patient not found')

    const nowUtc = new Date()
    const [dateStr, timeStr] = [dto.date, dto.startTime]
    // Brazil is always UTC-3 (DST abolished in 2019). Appointment times are in clinic local time.
    const appointmentDateTime = new Date(`${dateStr}T${timeStr}:00-03:00`)
    if (appointmentDateTime <= nowUtc) {
      throw new UnprocessableEntityException('Cannot book an appointment in the past')
    }

    // Delegates to the shared resolver so a schedule exception blocks a single
    // booking exactly as it blocks a recurring one — otherwise a user could work
    // around a block the recurrence preview had flagged.
    const resolution = await this.resolveProfessionalSlotUseCase.executeDetailed(
      professional.id,
      clinicId,
      dateStr,
      timeStr,
    )

    if (resolution.availability === RecurringOccurrenceAvailability.BLOCKED_BY_EXCEPTION) {
      throw new UnprocessableEntityException('Requested time is blocked on the professional schedule')
    }
    if (resolution.availability === RecurringOccurrenceAvailability.ALREADY_BOOKED) {
      throw new ConflictException('This slot is already booked')
    }
    if (resolution.availability !== RecurringOccurrenceAvailability.AVAILABLE) {
      throw new UnprocessableEntityException('Requested time is not an available slot')
    }

    const scheduleId = resolution.scheduleId!
    const endTime = resolution.endTime!
    const professionalId = professional.id
    const lockKey = `appointment:${clinicId}:${professionalId}:${dateStr}:${timeStr}`

    let appointment: Appointment
    try {
      appointment = await this.distributedLockService.runWithLock(lockKey, 10, () =>
        this.runInTransaction(async (queryRunner) => {
          const existing = await this.appointmentsRepository.findActiveBySlot(
            professionalId,
            dateStr,
            timeStr,
            clinicId,
            queryRunner,
          )
          if (existing) throw new ConflictException('This slot is already booked')

          return this.appointmentsRepository.create(
            {
              clinicId,
              professionalId,
              patientId: dto.patientId,
              specialtyId: chosenSpecialty?.id ?? null,
              scheduleId,
              date: dateStr,
              startTime: timeStr,
              endTime,
              reason: dto.reason ?? null,
              insuranceType: dto.insuranceType ?? null,
            },
            queryRunner,
          )
        }),
      )
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const pgError = error as QueryFailedError & { code?: string }
        if (pgError.code === '23505') throw new ConflictException('This slot is already booked')
      }
      throw error
    }

    try {
      await this.cacheService.delByPrefix(`appointments:list:${clinicId}:`)
      await this.cacheService.delByPrefix(`appointments:availability:${clinicId}:${professionalId}:`)
      await this.cacheService.delByPrefix(`dashboard:${clinicId}:`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: CreateAppointmentUseCase.name })
    }

    const [professionalName, patientName] = await Promise.all([
      this.fetchProfessionalName(professionalId),
      this.fetchPatientName(dto.patientId),
    ])

    return this.toResponse(
      appointment,
      professionalName,
      patientName,
      chosenSpecialty?.name ?? null,
      null,
    )
  }

  private resolveSpecialty(
    specialties: Array<{ id: string; name: string }>,
    requestedSpecialtyId?: string,
  ): { id: string; name: string } | null {
    if (requestedSpecialtyId) {
      const matched = specialties.find((specialty) => specialty.id === requestedSpecialtyId)
      if (!matched) {
        throw new UnprocessableEntityException('Specialty does not belong to this professional')
      }
      return matched
    }

    // Generalist professional: no specialties linked → appointment has no specialty.
    if (specialties.length === 0) {
      return null
    }

    if (specialties.length > 1) {
      throw new UnprocessableEntityException('specialtyId is required')
    }

    return specialties[0]
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
      seriesId: appointment.seriesId ?? null,
      seriesSequence: appointment.seriesSequence ?? null,
      seriesTotalOccurrences,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    }
  }
}
