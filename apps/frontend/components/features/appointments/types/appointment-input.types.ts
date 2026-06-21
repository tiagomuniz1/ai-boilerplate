import type { AppointmentStatus } from '@app/shared'

export interface IBookAppointmentInput {
  doctorId?: string
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
  doctorId?: string
  patientId?: string
  status?: AppointmentStatus
  from?: string
  to?: string
  page?: number
  limit?: number
}

export interface IAvailabilityParams {
  doctorId?: string
  date: string
}
