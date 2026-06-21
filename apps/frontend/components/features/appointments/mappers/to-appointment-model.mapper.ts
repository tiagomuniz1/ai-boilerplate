import type { AppointmentResponseDto } from '@app/shared'
import type { IAppointmentModel } from '../types/appointment-model.types'

export function toAppointmentModel(dto: AppointmentResponseDto): IAppointmentModel {
  return {
    id: dto.id,
    doctorId: dto.doctorId,
    doctorName: dto.doctorName,
    patientId: dto.patientId,
    patientName: dto.patientName,
    specialtyId: dto.specialtyId,
    specialtyName: dto.specialtyName,
    scheduleId: dto.scheduleId,
    date: dto.date,
    startTime: dto.startTime,
    endTime: dto.endTime,
    status: dto.status,
    reason: dto.reason,
    cancellationReason: dto.cancellationReason,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  }
}
