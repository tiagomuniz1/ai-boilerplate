import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { ConflictException } from '@nestjs/common'
import { DataSource, OptimisticLockVersionMismatchError, QueryRunner } from 'typeorm'
import {
  AppointmentCancellationScope,
  AppointmentResponseDto,
  AppointmentStatus,
  CancelAppointmentDto,
  CancelAppointmentResponseDto,
  UserRole,
} from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { Appointment } from '../entities/appointment.entity'
import { IAppointmentsRepository } from '../repositories/appointments.repository.interface'

@Injectable()
export class CancelAppointmentUseCase extends BaseUseCase {
  private readonly logger = new Logger(CancelAppointmentUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(
    id: string,
    dto: CancelAppointmentDto,
    currentUser: ICurrentUser,
  ): Promise<CancelAppointmentResponseDto> {
    const clinicId = currentUser.clinicId!

    const appointment = await this.appointmentsRepository.findById(id, clinicId)
    if (!appointment) throw new NotFoundException('Appointment not found')

    if (currentUser.role === UserRole.PROFESSIONAL) {
      const professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!professional || appointment.professionalId !== professional.id) {
        throw new ForbiddenException('You are not allowed to manage this appointment')
      }
    }

    if (
      appointment.status !== AppointmentStatus.SCHEDULED &&
      appointment.status !== AppointmentStatus.CONFIRMED
    ) {
      throw new UnprocessableEntityException('Only scheduled or confirmed appointments can be cancelled')
    }

    const scope = dto.scope ?? AppointmentCancellationScope.SINGLE_OCCURRENCE
    const cancelsWholeSeries = scope === AppointmentCancellationScope.THIS_AND_FUTURE_OCCURRENCES

    if (cancelsWholeSeries && !appointment.seriesId) {
      throw new UnprocessableEntityException('Appointment does not belong to a recurring series')
    }

    let updated: Appointment
    let cancelledAppointmentIds: string[]
    try {
      if (cancelsWholeSeries) {
        const cancelled = await this.cancelSeriesFrom(appointment, dto.cancellationReason ?? null, clinicId)
        updated = cancelled.find((candidate) => candidate.id === id) ?? cancelled[0]
        cancelledAppointmentIds = cancelled.map((candidate) => candidate.id)
      } else {
        updated = await this.appointmentsRepository.update(id, {
          status: AppointmentStatus.CANCELLED,
          cancellationReason: dto.cancellationReason ?? null,
        })
        cancelledAppointmentIds = [updated.id]
      }
    } catch (error) {
      if (error instanceof OptimisticLockVersionMismatchError) {
        throw new ConflictException('Record was modified by another process. Please try again.')
      }
      throw error
    }

    try {
      await this.cacheService.delByPrefix(`appointments:list:${clinicId}:`)
      await this.cacheService.delByPrefix(`appointments:availability:${clinicId}:${appointment.professionalId}:`)
      await this.cacheService.delByPrefix(`dashboard:${clinicId}:`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: CancelAppointmentUseCase.name })
    }

    const [professionalName, patientName, specialtyName] = await Promise.all([
      this.fetchProfessionalName(updated.professionalId),
      this.fetchPatientName(updated.patientId),
      this.fetchSpecialtyName(updated.specialtyId),
    ])

    return {
      ...this.toResponse(
        updated,
        professionalName,
        patientName,
        specialtyName,
        appointment.series?.createdOccurrenceCount ?? null,
      ),
      cancelledOccurrenceCount: cancelledAppointmentIds.length,
      cancelledAppointmentIds,
    }
  }

  /**
   * Cancels the given occurrence and every later one in the same series, in one
   * transaction. "Future" means later in the series, not later than now: an
   * occurrence that already passed but is still scheduled counts. The ownership
   * check on the target covers the siblings, since a series has a single
   * professional — reassigning one occurrence is blocked for that reason.
   */
  private async cancelSeriesFrom(
    appointment: Appointment,
    cancellationReason: string | null,
    clinicId: string,
  ): Promise<Appointment[]> {
    return this.runInTransaction(async (queryRunner: QueryRunner) => {
      const occurrences = await this.appointmentsRepository.findBySeriesIdFromDate(
        appointment.seriesId!,
        clinicId,
        appointment.date,
        [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
        queryRunner,
      )

      const cancelled: Appointment[] = []
      for (const occurrence of occurrences) {
        cancelled.push(
          await this.appointmentsRepository.update(
            occurrence.id,
            { status: AppointmentStatus.CANCELLED, cancellationReason },
            queryRunner,
          ),
        )
      }
      return cancelled
    })
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
