import type { PatientResponseDto } from '@app/shared'
import type { IPatientModel } from '../types/patient-model.types'

export function toPatientModel(dto: PatientResponseDto): IPatientModel {
  return {
    id: dto.id,
    fullName: dto.user.fullName,
    email: dto.user.email,
    phoneNumber: dto.phoneNumber,
    birthDate: new Date(dto.birthDate),
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
