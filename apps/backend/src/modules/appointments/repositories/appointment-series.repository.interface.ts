import { QueryRunner } from 'typeorm'
import { DayOfWeek, RecurrenceInterval } from '@app/shared'
import { AppointmentSeries } from '../entities/appointment-series.entity'

export interface CreateAppointmentSeriesData {
  clinicId: string
  professionalId: string
  patientId: string
  specialtyId: string | null
  recurrenceInterval: RecurrenceInterval
  dayOfWeek: DayOfWeek
  startTime: string
  anchorDate: string
  requestedOccurrenceCount: number | null
  requestedUntilDate: string | null
  createdOccurrenceCount: number
  createdByUserId: string
}

export abstract class IAppointmentSeriesRepository {
  abstract create(data: CreateAppointmentSeriesData, queryRunner?: QueryRunner): Promise<AppointmentSeries>
  abstract findById(id: string, clinicId: string): Promise<AppointmentSeries | null>
}
