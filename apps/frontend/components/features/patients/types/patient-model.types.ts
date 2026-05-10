import { PatientGender } from '@app/shared'

export interface IPatientModel {
  id: string
  fullName: string
  email: string
  phoneNumber: string
  birthDate: Date
  documentNumber: string
  gender: PatientGender
  createdAt: Date
  updatedAt: Date
}
