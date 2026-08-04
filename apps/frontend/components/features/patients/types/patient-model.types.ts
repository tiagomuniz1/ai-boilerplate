import { KinshipType, PatientGender } from '@app/shared'

export interface IPatientResponsibleRef {
  id: string
  fullName: string
  documentNumber: string | null
}

export interface IPatientDependentRef {
  id: string
  fullName: string
  kinshipType: KinshipType
}

export interface IPatientModel {
  id: string
  fullName: string
  email: string
  phoneNumber: string
  birthDate: Date
  documentNumber: string | null
  gender: PatientGender
  responsiblePatientId: string | null
  kinshipType: KinshipType | null
  responsiblePatient: IPatientResponsibleRef | null
  dependents: IPatientDependentRef[]
  createdAt: Date
  updatedAt: Date
}
