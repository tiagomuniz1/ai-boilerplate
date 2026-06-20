import { QueryRunner } from 'typeorm'
import { AppointmentStatus } from '@app/shared'
import { ListAppointmentsQueryDto } from '../dto/list-appointments-query.dto'
import { Appointment } from '../entities/appointment.entity'

export interface CreateAppointmentData {
  clinicId: string
  doctorId: string
  patientId: string
  specialtyId: string | null
  scheduleId: string
  date: string
  startTime: string
  endTime: string
  reason: string | null
}

export interface UpdateAppointmentData {
  status?: AppointmentStatus
  cancellationReason?: string | null
}

export abstract class IAppointmentsRepository {
  abstract findAll(filters: ListAppointmentsQueryDto, clinicId: string): Promise<[Appointment[], number]>
  abstract findById(id: string, clinicId: string): Promise<Appointment | null>
  abstract findActiveByDoctorAndDate(doctorId: string, date: string, clinicId: string): Promise<Appointment[]>
  abstract findActiveBySlot(doctorId: string, date: string, startTime: string, clinicId: string, queryRunner?: QueryRunner): Promise<Appointment | null>
  abstract hasFutureByScheduleId(scheduleId: string, clinicId: string): Promise<boolean>
  abstract create(data: CreateAppointmentData, queryRunner?: QueryRunner): Promise<Appointment>
  abstract update(id: string, data: UpdateAppointmentData, queryRunner?: QueryRunner): Promise<Appointment>
}
