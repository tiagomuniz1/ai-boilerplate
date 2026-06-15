import { PatientGender } from '@app/shared'

export interface ICreatePatientInput {
  userId?: string
  fullName?: string
  email?: string
  phoneNumber: string
  birthDate: string
  documentNumber: string
  gender: PatientGender
}

export interface IUpdatePatientInput {
  fullName?: string
  email?: string
  phoneNumber?: string
  birthDate?: string
  gender?: PatientGender
}

export interface IPatientListParams {
  search?: string
  page?: number
  limit?: number
}
