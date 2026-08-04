import type { UpdatePatientDto } from '@app/shared'
import type { IUpdatePatientInput } from '../types/patient-input.types'

export function toUpdatePatientDto(input: IUpdatePatientInput): UpdatePatientDto {
  return {
    fullName: input.fullName,
    email: input.email,
    phoneNumber: input.phoneNumber,
    birthDate: input.birthDate,
    gender: input.gender,
    documentNumber: input.documentNumber,
    responsiblePatientId: input.responsiblePatientId,
    kinshipType: input.kinshipType,
  }
}
