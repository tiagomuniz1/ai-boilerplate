import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { AppointmentResponseDto, PaginatedAppointmentsResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { ListAppointmentsQueryDto } from '../dto/list-appointments-query.dto'
import { Appointment } from '../entities/appointment.entity'
import { IAppointmentsRepository } from '../repositories/appointments.repository.interface'

@Injectable()
export class ListAppointmentsUseCase extends BaseUseCase {
  private readonly logger = new Logger(ListAppointmentsUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(query: ListAppointmentsQueryDto, currentUser: ICurrentUser): Promise<PaginatedAppointmentsResponseDto> {
    const clinicId = currentUser.clinicId!
    const effectiveQuery = { ...query }

    if (currentUser.role === UserRole.DOCTOR) {
      const doctor = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!doctor) throw new NotFoundException('Professional not found')
      effectiveQuery.doctorId = doctor.id
    }

    const { doctorId, patientId, status, from, to, page = 1, limit = 20 } = effectiveQuery

    const cacheKey = `appointments:list:${clinicId}:${doctorId ?? 'all'}:${patientId ?? 'all'}:${status ?? 'all'}:${from ?? 'all'}:${to ?? 'all'}:${page}:${limit}`

    try {
      const cached = await this.cacheService.get<PaginatedAppointmentsResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: ListAppointmentsUseCase.name })
    }

    const [appointments, total] = await this.appointmentsRepository.findAll(effectiveQuery, clinicId)

    const doctorIds = [...new Set(appointments.map((a) => a.doctorId))]
    const patientIds = [...new Set(appointments.map((a) => a.patientId))]
    const specialtyIds = [
      ...new Set(appointments.map((a) => a.specialtyId).filter((id): id is string => id !== null)),
    ]

    const [doctorNames, patientNames, specialtyNames] = await Promise.all([
      this.fetchDoctorNames(doctorIds),
      this.fetchPatientNames(patientIds),
      this.fetchSpecialtyNames(specialtyIds),
    ])

    const result: PaginatedAppointmentsResponseDto = {
      data: appointments.map((a) =>
        this.toResponse(
          a,
          doctorNames.get(a.doctorId) ?? '',
          patientNames.get(a.patientId) ?? '',
          a.specialtyId ? specialtyNames.get(a.specialtyId) ?? null : null,
        ),
      ),
      total,
      page,
      limit,
    }

    try {
      await this.cacheService.set(cacheKey, result, 30)
    } catch {
      this.logger.warn('Cache write failed', { context: ListAppointmentsUseCase.name })
    }

    return result
  }

  private async fetchDoctorNames(doctorIds: string[]): Promise<Map<string, string>> {
    if (doctorIds.length === 0) return new Map()
    const rows: Array<{ doctorId: string; fullName: string }> = await this.dataSource
      .createQueryBuilder()
      .select('d.id', 'doctorId')
      .addSelect('u.full_name', 'fullName')
      .from('professionals', 'd')
      .innerJoin('users', 'u', 'u.id = d.user_id AND u.deleted_at IS NULL')
      .where('d.id IN (:...ids)', { ids: doctorIds })
      .andWhere('d.deleted_at IS NULL')
      .getRawMany()
    return new Map(rows.map((r) => [r.doctorId, r.fullName]))
  }

  private async fetchPatientNames(patientIds: string[]): Promise<Map<string, string>> {
    if (patientIds.length === 0) return new Map()
    const rows: Array<{ patientId: string; fullName: string }> = await this.dataSource
      .createQueryBuilder()
      .select('p.id', 'patientId')
      .addSelect('u.full_name', 'fullName')
      .from('patients', 'p')
      .innerJoin('users', 'u', 'u.id = p.user_id AND u.deleted_at IS NULL')
      .where('p.id IN (:...ids)', { ids: patientIds })
      .andWhere('p.deleted_at IS NULL')
      .getRawMany()
    return new Map(rows.map((r) => [r.patientId, r.fullName]))
  }

  private async fetchSpecialtyNames(specialtyIds: string[]): Promise<Map<string, string>> {
    if (specialtyIds.length === 0) return new Map()
    const rows: Array<{ specialtyId: string; name: string }> = await this.dataSource
      .createQueryBuilder()
      .select('s.id', 'specialtyId')
      .addSelect('s.name', 'name')
      .from('specialties', 's')
      .where('s.id IN (:...ids)', { ids: specialtyIds })
      .andWhere('s.deleted_at IS NULL')
      .getRawMany()
    return new Map(rows.map((r) => [r.specialtyId, r.name]))
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
