import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { DataSource, OptimisticLockVersionMismatchError } from 'typeorm'
import { AppointmentResponseDto, AppointmentStatus, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { Appointment } from '../entities/appointment.entity'
import { IAppointmentsRepository } from '../repositories/appointments.repository.interface'

@Injectable()
export class ConfirmAppointmentUseCase extends BaseUseCase {
  private readonly logger = new Logger(ConfirmAppointmentUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly doctorsRepository: IDoctorsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<AppointmentResponseDto> {
    const clinicId = currentUser.clinicId!

    const appointment = await this.appointmentsRepository.findById(id, clinicId)
    if (!appointment) throw new NotFoundException('Appointment not found')

    if (currentUser.role === UserRole.DOCTOR) {
      const doctor = await this.doctorsRepository.findByUserId(currentUser.id, clinicId)
      if (!doctor || appointment.doctorId !== doctor.id) {
        throw new ForbiddenException('You are not allowed to manage this appointment')
      }
    }

    if (appointment.status !== AppointmentStatus.SCHEDULED) {
      throw new UnprocessableEntityException('Only scheduled appointments can be confirmed')
    }

    let updated: Appointment
    try {
      updated = await this.appointmentsRepository.update(id, { status: AppointmentStatus.CONFIRMED })
    } catch (error) {
      if (error instanceof OptimisticLockVersionMismatchError) {
        throw new ConflictException('Record was modified by another process. Please try again.')
      }
      throw error
    }

    try {
      await this.cacheService.delByPrefix(`appointments:list:${clinicId}:`)
      await this.cacheService.delByPrefix(`appointments:availability:${clinicId}:${appointment.doctorId}:`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: ConfirmAppointmentUseCase.name })
    }

    const [doctorName, patientName, specialtyName] = await Promise.all([
      this.fetchDoctorName(updated.doctorId),
      this.fetchPatientName(updated.patientId),
      this.fetchSpecialtyName(updated.specialtyId),
    ])

    return this.toResponse(updated, doctorName, patientName, specialtyName)
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

  private async fetchDoctorName(doctorId: string): Promise<string> {
    const rows: Array<{ fullName: string }> = await this.dataSource
      .createQueryBuilder()
      .select('u.full_name', 'fullName')
      .from('doctors', 'd')
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
