import { KinshipType, PatientGender } from '@app/shared'

export interface ICreatePatientInput {
  userId?: string
  fullName?: string
  email?: string
  phoneNumber: string
  birthDate: string
  documentNumber?: string
  gender: PatientGender
  responsiblePatientId?: string
  kinshipType?: KinshipType
}

export interface IUpdatePatientInput {
  fullName?: string
  email?: string
  phoneNumber?: string
  birthDate?: string
  gender?: PatientGender
  documentNumber?: string
  responsiblePatientId?: string | null
  kinshipType?: KinshipType | null
}

export interface IPatientListParams {
  search?: string
  page?: number
  limit?: number
  excludeDependents?: boolean
  excludeId?: string
}
