import type { CreatePatientDto } from '@app/shared'
import type { ICreatePatientInput } from '../types/patient-input.types'

export function toCreatePatientDto(input: ICreatePatientInput): CreatePatientDto {
  return {
    fullName: input.fullName,
    email: input.email,
    phoneNumber: input.phoneNumber,
    birthDate: input.birthDate,
    documentNumber: input.documentNumber,
    gender: input.gender,
  }
}
