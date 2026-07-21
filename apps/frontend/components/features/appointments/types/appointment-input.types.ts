import type { AppointmentStatus } from '@app/shared'

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
