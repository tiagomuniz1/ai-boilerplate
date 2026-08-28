import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { DataSource, OptimisticLockVersionMismatchError, QueryFailedError } from 'typeorm'
import { AppointmentResponseDto, AppointmentStatus, ReassignAppointmentDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { DistributedLockService } from '../../../cache/distributed-lock.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { Appointment } from '../entities/appointment.entity'
import { IAppointmentsRepository } from '../repositories/appointments.repository.interface'
import { isEligibleReassignTarget } from '../utils/reassign-eligibility.util'
import { ResolveProfessionalSlotUseCase } from './resolve-professional-slot.use-case'

@Injectable()
export class ReassignAppointmentUseCase extends BaseUseCase {
  private readonly logger = new Logger(ReassignAppointmentUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly resolveProfessionalSlotUseCase: ResolveProfessionalSlotUseCase,
    private readonly cacheService: CacheService,
    private readonly distributedLockService: DistributedLockService,
  ) {
    super(dataSource)
  }

  async execute(
    id: string,
    dto: ReassignAppointmentDto,
    currentUser: ICurrentUser,
  ): Promise<AppointmentResponseDto> {
    const clinicId = currentUser.clinicId!

    const appointment = await this.appointmentsRepository.findById(id, clinicId)
    if (!appointment) throw new NotFoundException('Appointment not found')

    if (appointment.status !== AppointmentStatus.SCHEDULED) {
      throw new UnprocessableEntityException(
        'Só é possível trocar o profissional de consultas agendadas.',
      )
    }

    // A series is assumed to have a single professional — the ownership check when
    // cancelling "this and all future" relies on it. Reassigning a whole series is
    // a separate feature.
    if (appointment.seriesId) {
      throw new UnprocessableEntityException(
        'Não é possível trocar o profissional de uma consulta que faz parte de uma série recorrente.',
      )
    }

    if (dto.professionalId === appointment.professionalId) {
      throw new UnprocessableEntityException('Este profissional já é o responsável por esta consulta.')
    }

    const original = await this.professionalsRepository.findById(appointment.professionalId, clinicId)
    if (!original) throw new NotFoundException('Professional not found')

    const target = await this.professionalsRepository.findById(dto.professionalId, clinicId)
    if (!target) throw new NotFoundException('Professional not found')

    if (!isEligibleReassignTarget(target, original, appointment.specialtyId)) {
      throw new UnprocessableEntityException(
        'O profissional selecionado não atende a mesma especialidade/profissão desta consulta.',
      )
    }

    const nowUtc = new Date()
    // Brazil is always UTC-3 (DST abolished in 2019). Appointment times are in clinic local time.
    const appointmentDateTime = new Date(`${appointment.date}T${appointment.startTime}:00-03:00`)
    if (appointmentDateTime <= nowUtc) {
      throw new UnprocessableEntityException('Cannot reassign an appointment in the past')
    }

    const slot = await this.resolveProfessionalSlotUseCase.execute(
      target.id,
      clinicId,
      appointment.date,
      appointment.startTime,
    )
    if (!slot) {
      throw new UnprocessableEntityException('O profissional selecionado não está disponível neste horário.')
    }

    const lockKey = `appointment:${clinicId}:${target.id}:${appointment.date}:${appointment.startTime}`

    let updated: Appointment
    try {
      updated = await this.distributedLockService.runWithLock(lockKey, 10, () =>
        this.runInTransaction(async (queryRunner) => {
          const existing = await this.appointmentsRepository.findActiveBySlot(
            target.id,
            appointment.date,
            appointment.startTime,
            clinicId,
            queryRunner,
          )
          if (existing) throw new ConflictException('This slot is already booked')

          return this.appointmentsRepository.update(
            id,
            { professionalId: target.id, scheduleId: slot.scheduleId, endTime: slot.endTime },
            queryRunner,
          )
        }),
      )
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const pgError = error as QueryFailedError & { code?: string }
        if (pgError.code === '23505') throw new ConflictException('This slot is already booked')
      }
      if (error instanceof OptimisticLockVersionMismatchError) {
        throw new ConflictException('Record was modified by another process. Please try again.')
      }
      throw error
    }

    try {
      await this.cacheService.delByPrefix(`appointments:list:${clinicId}:`)
      await this.cacheService.delByPrefix(`appointments:availability:${clinicId}:${original.id}:`)
      await this.cacheService.delByPrefix(`appointments:availability:${clinicId}:${target.id}:`)
      await this.cacheService.delByPrefix(`dashboard:${clinicId}:`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: ReassignAppointmentUseCase.name })
    }

    const [professionalName, patientName, specialtyName] = await Promise.all([
      this.fetchProfessionalName(updated.professionalId),
      this.fetchPatientName(updated.patientId),
      this.fetchSpecialtyName(updated.specialtyId),
    ])

    return this.toResponse(updated, professionalName, patientName, specialtyName, null)
  }

  private async fetchSpecialtyName(specialtyId: string | null): Promise<string | null> {
    if (!specialtyId) return null
    const rows: Array<{ name: string }> = await this.dataSource
      .createQueryBuilder()
      .select('s.name', 'name')
      .from('specialties', 's')
      .where('s.id = :specialtyId', { specialtyId })
      .andWhere('s.deleted_at IS NULL')
      .getRawMany()
    return rows[0]?.name ?? null
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
