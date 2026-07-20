import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { DataSource, QueryFailedError } from 'typeorm'
import { AppointmentResponseDto, CreateAppointmentDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { DistributedLockService } from '../../../cache/distributed-lock.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IPatientsRepository } from '../../patients/repositories/patients.repository.interface'
import { GetActiveSchedulesForDoctorUseCase } from '../../schedules/use-cases/get-active-schedules-for-doctor.use-case'
import { Schedule } from '../../schedules/entities/schedule.entity'
import { Appointment } from '../entities/appointment.entity'
import { IAppointmentsRepository } from '../repositories/appointments.repository.interface'

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0')
  const m = (minutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

function generateSlots(schedule: Schedule): Array<{ startTime: string; endTime: string; scheduleId: string; slotDurationInMinutes: number }> {
  const slots: Array<{ startTime: string; endTime: string; scheduleId: string; slotDurationInMinutes: number }> = []
  const start = timeToMinutes(schedule.startTime)
  const end = timeToMinutes(schedule.endTime)
  const duration = schedule.slotDurationInMinutes

  for (let t = start; t + duration <= end; t += duration) {
    slots.push({
      startTime: minutesToTime(t),
      endTime: minutesToTime(t + duration),
      scheduleId: schedule.id,
      slotDurationInMinutes: duration,
    })
  }
  return slots
}

@Injectable()
export class CreateAppointmentUseCase extends BaseUseCase {
  private readonly logger = new Logger(CreateAppointmentUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly patientsRepository: IPatientsRepository,
    private readonly getActiveSchedulesUseCase: GetActiveSchedulesForDoctorUseCase,
    private readonly cacheService: CacheService,
    private readonly distributedLockService: DistributedLockService,
  ) {
    super(dataSource)
  }

  async execute(dto: CreateAppointmentDto, currentUser: ICurrentUser): Promise<AppointmentResponseDto> {
    const clinicId = currentUser.clinicId!

    let doctor
    if (currentUser.role === UserRole.DOCTOR) {
      doctor = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
    } else {
      if (!dto.doctorId) throw new UnprocessableEntityException('doctorId is required for admin')
      doctor = await this.professionalsRepository.findById(dto.doctorId, clinicId)
    }
    if (!doctor) throw new NotFoundException('Professional not found')

    const chosenSpecialty = this.resolveSpecialty(
      doctor.professionalSpecialties.map((ds) => ({ id: ds.specialtyId, name: ds.specialty.name })),
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

    const schedules = await this.getActiveSchedulesUseCase.execute(doctor.id, clinicId, dateStr)

    let matchedSlot: { startTime: string; endTime: string; scheduleId: string; slotDurationInMinutes: number } | undefined
    for (const schedule of schedules) {
      const slots = generateSlots(schedule)
      const found = slots.find((s) => s.startTime === timeStr)
      if (found) {
        matchedSlot = found
        break
      }
    }

    if (!matchedSlot) {
      throw new UnprocessableEntityException('Requested time is not an available slot')
    }

    const { scheduleId, endTime } = matchedSlot
    const doctorId = doctor.id
    const lockKey = `appointment:${clinicId}:${doctorId}:${dateStr}:${timeStr}`

    let appointment: Appointment
    try {
      appointment = await this.distributedLockService.runWithLock(lockKey, 10, () =>
        this.runInTransaction(async (queryRunner) => {
          const existing = await this.appointmentsRepository.findActiveBySlot(
            doctorId,
            dateStr,
            timeStr,
            clinicId,
            queryRunner,
          )
          if (existing) throw new ConflictException('This slot is already booked')

          return this.appointmentsRepository.create(
            {
              clinicId,
              doctorId,
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
      await this.cacheService.delByPrefix(`appointments:availability:${clinicId}:${doctorId}:`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: CreateAppointmentUseCase.name })
    }

    const [doctorName, patientName] = await Promise.all([
      this.fetchDoctorName(doctorId),
      this.fetchPatientName(dto.patientId),
    ])

    return this.toResponse(appointment, doctorName, patientName, chosenSpecialty?.name ?? null)
  }

  private resolveSpecialty(
    specialties: Array<{ id: string; name: string }>,
    requestedSpecialtyId?: string,
  ): { id: string; name: string } | null {
    if (requestedSpecialtyId) {
      const matched = specialties.find((specialty) => specialty.id === requestedSpecialtyId)
      if (!matched) {
        throw new UnprocessableEntityException('Specialty does not belong to this doctor')
      }
      return matched
    }

    // Generalist doctor: no specialties linked → appointment has no specialty.
    if (specialties.length === 0) {
      return null
    }

    if (specialties.length > 1) {
      throw new UnprocessableEntityException('specialtyId is required')
    }

    return specialties[0]
  }

  private async fetchDoctorName(doctorId: string): Promise<string> {
    const rows: Array<{ fullName: string }> = await this.dataSource
      .createQueryBuilder()
      .select('u.full_name', 'fullName')
      .from('professionals', 'd')
      .innerJoin('users', 'u', 'u.id = d.user_id AND u.deleted_at IS NULL')
      .where('d.id = :doctorId', { doctorId })
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
    doctorName: string,
    patientName: string,
    specialtyName: string | null,
  ): AppointmentResponseDto {
    return {
      id: appointment.id,
      doctorId: appointment.doctorId,
      doctorName,
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
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    }
  }
}
