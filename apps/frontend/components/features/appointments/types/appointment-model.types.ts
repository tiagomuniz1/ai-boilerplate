import type {
  AppointmentStatus,
  DayOfWeek,
  PatientGender,
  RecurrenceInterval,
  RecurringOccurrenceAvailability,
} from '@app/shared'

export interface IAppointmentPatientModel {
  fullName: string
  email: string
  phoneNumber: string
  birthDate: Date
  documentNumber: string | null
  gender: PatientGender
}

export interface IAppointmentDetailModel extends IAppointmentModel {
  patient: IAppointmentPatientModel
  /** Still-cancellable occurrences after this one; null outside a series. */
  seriesFutureCount: number | null
}

export interface IAppointmentModel {
  id: string
  professionalId: string
  professionalName: string
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
  seriesId: string | null
  seriesSequence: number | null
  seriesTotalOccurrences: number | null
  createdAt: Date
  updatedAt: Date
}

export interface IRecurrenceOccurrenceModel {
  date: string
  startTime: string
  endTime: string | null
  availability: RecurringOccurrenceAvailability
  selectable: boolean
}

export interface IRecurrencePreviewModel {
  professionalId: string
  recurrenceInterval: RecurrenceInterval
  dayOfWeek: DayOfWeek
  startTime: string
  occurrences: IRecurrenceOccurrenceModel[]
  availableOccurrenceCount: number
  unavailableOccurrenceCount: number
  truncatedByMaximumOccurrences: boolean
  truncatedByHorizon: boolean
}

export interface IAppointmentSeriesModel {
  id: string
  professionalName: string
  patientName: string
  specialtyName: string | null
  recurrenceInterval: RecurrenceInterval
  dayOfWeek: DayOfWeek
  startTime: string
  anchorDate: string
  createdOccurrenceCount: number
  occurrences: IAppointmentModel[]
}

export interface IRecurringAppointmentsResultModel {
  seriesId: string
  createdOccurrenceCount: number
  appointments: IAppointmentModel[]
}

export interface IReassignCandidateModel {
  professionalId: string
  professionalName: string
  specialtyName: string | null
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
