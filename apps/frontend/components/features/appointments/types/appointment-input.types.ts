import type {
  AppointmentCancellationScope,
  AppointmentStatus,
  RecurrenceInterval,
} from '@app/shared'

export interface IBookAppointmentInput {
  professionalId?: string
  patientId: string
  date: string
  startTime: string
  reason?: string
  specialtyId?: string
}

export interface ICancelAppointmentInput {
  cancellationReason?: string
  scope?: AppointmentCancellationScope
}

export interface IRecurrencePreviewInput {
  professionalId?: string
  patientId: string
  date: string
  startTime: string
  recurrenceInterval: RecurrenceInterval
  occurrenceCount?: number
  untilDate?: string
}

export interface IBookRecurringAppointmentsInput {
  professionalId?: string
  specialtyId?: string
  patientId: string
  startTime: string
  recurrenceInterval: RecurrenceInterval
  dates: string[]
  occurrenceCount?: number
  untilDate?: string
  reason?: string
}

export interface IAppointmentListParams {
  professionalId?: string
  patientId?: string
  status?: AppointmentStatus
  from?: string
  to?: string
  page?: number
  limit?: number
}

export interface IAvailabilityParams {
  professionalId?: string
  date: string
}
