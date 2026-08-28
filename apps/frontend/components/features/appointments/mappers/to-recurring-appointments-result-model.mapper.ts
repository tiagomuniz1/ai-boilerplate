import type { CreateRecurringAppointmentsResponseDto } from '@app/shared'
import type { IRecurringAppointmentsResultModel } from '../types/appointment-model.types'
import { toAppointmentModel } from './to-appointment-model.mapper'

export function toRecurringAppointmentsResultModel(
  dto: CreateRecurringAppointmentsResponseDto,
): IRecurringAppointmentsResultModel {
  return {
    seriesId: dto.seriesId,
    createdOccurrenceCount: dto.createdOccurrenceCount,
    appointments: dto.appointments.map(toAppointmentModel),
  }
}
