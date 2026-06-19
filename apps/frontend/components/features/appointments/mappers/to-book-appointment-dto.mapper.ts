import type { CreateAppointmentDto } from '@app/shared'
import type { IBookAppointmentInput } from '../types/appointment-input.types'

export function toBookAppointmentDto(input: IBookAppointmentInput): CreateAppointmentDto {
  return {
    doctorId: input.doctorId,
    patientId: input.patientId,
    date: input.date,
    startTime: input.startTime,
    reason: input.reason || undefined,
  }
}
