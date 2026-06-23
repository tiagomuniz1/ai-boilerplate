import type { AppointmentStatus } from '@app/shared'

export interface IAppointmentModel {
  id: string
  doctorId: string
  doctorName: string
  patientId: string
  patientName: string
  specialtyId: string | null
  specialtyName: string | null
  scheduleId: string
  date: string
  startTime: string
  endTime: string
  status: AppointmentStatus
  reason: string | null
  cancellationReason: string | null
  createdAt: Date
  updatedAt: Date
}

export interface IAvailableSlotModel {
  startTime: string
  endTime: string
  scheduleId: string
  slotDurationInMinutes: number
}

export type AgendaSlotStatus = 'free' | 'booked'

export interface IAgendaSlot {
  startTime: string
  endTime: string
  status: AgendaSlotStatus
  appointment: IAppointmentModel | null
}

export interface IPaginatedAppointmentsModel {
  data: IAppointmentModel[]
  total: number
  page: number
  limit: number
}

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: 'Agendada',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Concluída',
  no_show: 'Faltou',
}
