import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { AppointmentResponseDto, AppointmentSeriesResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { AppointmentSeries } from '../entities/appointment-series.entity'
import { Appointment } from '../entities/appointment.entity'
import { IAppointmentSeriesRepository } from '../repositories/appointment-series.repository.interface'
import { IAppointmentsRepository } from '../repositories/appointments.repository.interface'

@Injectable()
export class FindAppointmentSeriesByIdUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly appointmentSeriesRepository: IAppointmentSeriesRepository,
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
  ) {
    super(dataSource)
  }

  async execute(seriesId: string, currentUser: ICurrentUser): Promise<AppointmentSeriesResponseDto> {
    const clinicId = currentUser.clinicId!

    const series = await this.appointmentSeriesRepository.findById(seriesId, clinicId)
    if (!series) throw new NotFoundException('Appointment series not found')

    if (currentUser.role === UserRole.PROFESSIONAL) {
      const professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!professional || series.professionalId !== professional.id) {
        throw new ForbiddenException('You are not allowed to view this appointment series')
      }
    }

    const [occurrences, professionalName, patientName, specialtyName] = await Promise.all([
      this.appointmentsRepository.findBySeriesId(seriesId, clinicId),
      this.fetchProfessionalName(series.professionalId),
      this.fetchPatientName(series.patientId),
      this.fetchSpecialtyName(series.specialtyId),
    ])

    return this.toResponse(series, occurrences, professionalName, patientName, specialtyName)
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
    series: AppointmentSeries,
    occurrences: Appointment[],
    professionalName: string,
    patientName: string,
    specialtyName: string | null,
  ): AppointmentSeriesResponseDto {
    return {
      id: series.id,
      professionalId: series.professionalId,
      professionalName,
      patientId: series.patientId,
      patientName,
      specialtyId: series.specialtyId,
      specialtyName,
      recurrenceInterval: series.recurrenceInterval,
      dayOfWeek: series.dayOfWeek,
      startTime: series.startTime,
      anchorDate: series.anchorDate,
      requestedOccurrenceCount: series.requestedOccurrenceCount,
      requestedUntilDate: series.requestedUntilDate,
      createdOccurrenceCount: series.createdOccurrenceCount,
      createdAt: series.createdAt,
      occurrences: occurrences.map((occurrence) =>
        this.toOccurrenceResponse(occurrence, professionalName, patientName, specialtyName, series.createdOccurrenceCount),
      ),
    }
  }

  private toOccurrenceResponse(
    appointment: Appointment,
    professionalName: string,
    patientName: string,
    specialtyName: string | null,
    seriesTotalOccurrences: number,
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
