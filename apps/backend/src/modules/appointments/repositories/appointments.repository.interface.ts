import { QueryRunner } from 'typeorm'
import { AppointmentInsuranceType, AppointmentStatus } from '@app/shared'
import { ListAppointmentsQueryDto } from '../dto/list-appointments-query.dto'
import { Appointment } from '../entities/appointment.entity'

export interface CreateAppointmentData {
  clinicId: string
  professionalId: string
  patientId: string
  specialtyId: string | null
  scheduleId: string
  date: string
  startTime: string
  endTime: string
  reason: string | null
  insuranceType?: AppointmentInsuranceType | null
  seriesId?: string | null
  seriesSequence?: number | null
}

export interface UpdateAppointmentData {
  status?: AppointmentStatus
  cancellationReason?: string | null
  professionalId?: string
  scheduleId?: string
  endTime?: string
}

export abstract class IAppointmentsRepository {
  abstract findAll(filters: ListAppointmentsQueryDto, clinicId: string): Promise<[Appointment[], number]>
  abstract findById(id: string, clinicId: string): Promise<Appointment | null>
  abstract findActiveByProfessionalAndDate(professionalId: string, date: string, clinicId: string): Promise<Appointment[]>
  abstract findActiveBySlot(professionalId: string, date: string, startTime: string, clinicId: string, queryRunner?: QueryRunner): Promise<Appointment | null>
  abstract findActiveByDatesAndTime(professionalId: string, clinicId: string, dates: string[], startTime: string, queryRunner?: QueryRunner): Promise<Appointment[]>
  abstract findBySeriesId(seriesId: string, clinicId: string): Promise<Appointment[]>
  abstract findBySeriesIdFromDate(seriesId: string, clinicId: string, fromDate: string, statuses: AppointmentStatus[], queryRunner?: QueryRunner): Promise<Appointment[]>
  abstract countBySeriesIdAfterDate(seriesId: string, clinicId: string, afterDate: string, statuses: AppointmentStatus[]): Promise<number>
  abstract hasFutureByScheduleId(scheduleId: string, clinicId: string): Promise<boolean>
  abstract hasFutureByProfessionalId(professionalId: string, clinicId: string): Promise<boolean>
  abstract create(data: CreateAppointmentData, queryRunner?: QueryRunner): Promise<Appointment>
  abstract update(id: string, data: UpdateAppointmentData, queryRunner?: QueryRunner): Promise<Appointment>
}
