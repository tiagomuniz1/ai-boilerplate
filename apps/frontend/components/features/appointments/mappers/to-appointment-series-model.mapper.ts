import type { AppointmentSeriesResponseDto } from '@app/shared'
import type { IAppointmentSeriesModel } from '../types/appointment-model.types'
import { toAppointmentModel } from './to-appointment-model.mapper'

export function toAppointmentSeriesModel(
  dto: AppointmentSeriesResponseDto,
): IAppointmentSeriesModel {
  return {
    id: dto.id,
    professionalName: dto.professionalName,
    patientName: dto.patientName,
    specialtyName: dto.specialtyName,
    recurrenceInterval: dto.recurrenceInterval,
    dayOfWeek: dto.dayOfWeek,
    startTime: dto.startTime,
    anchorDate: dto.anchorDate,
    createdOccurrenceCount: dto.createdOccurrenceCount,
    occurrences: dto.occurrences.map(toAppointmentModel),
  }
}
