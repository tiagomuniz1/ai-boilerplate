import type { PatientResponseDto } from '@app/shared'
import type { IPatientModel } from '../types/patient-model.types'

export function toPatientModel(dto: PatientResponseDto): IPatientModel {
  return {
    id: dto.id,
    fullName: dto.user.fullName,
    email: dto.user.email,
    phoneNumber: dto.phoneNumber,
    // `new Date('1987-05-01')` parses as UTC midnight and renders as the previous
    // day in UTC-3. Same pattern already used in to-appointment-detail-model.
    birthDate: new Date(dto.birthDate + 'T00:00:00'),
    documentNumber: dto.documentNumber,
    gender: dto.gender,
    responsiblePatientId: dto.responsiblePatientId,
    kinshipType: dto.kinshipType,
    responsiblePatient: dto.responsiblePatient,
    dependents: dto.dependents,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  }
}
