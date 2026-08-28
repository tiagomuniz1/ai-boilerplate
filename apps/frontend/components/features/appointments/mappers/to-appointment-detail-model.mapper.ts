import type { AppointmentDetailResponseDto } from '@app/shared'
import type { IAppointmentDetailModel } from '../types/appointment-model.types'
import { toAppointmentModel } from './to-appointment-model.mapper'

export function toAppointmentDetailModel(dto: AppointmentDetailResponseDto): IAppointmentDetailModel {
  return {
    ...toAppointmentModel(dto),
    patient: {
      fullName: dto.patient.fullName,
      email: dto.patient.email,
      phoneNumber: dto.patient.phoneNumber,
      birthDate: new Date(dto.patient.birthDate + 'T00:00:00'),
      documentNumber: dto.patient.documentNumber,
      gender: dto.patient.gender,
    },
    seriesFutureCount: dto.seriesFutureCount,
  }
}
