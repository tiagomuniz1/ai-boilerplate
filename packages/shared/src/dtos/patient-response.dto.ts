import { PatientGender } from '../enums/patient-gender.enum'
import { KinshipType } from '../enums/kinship-type.enum'

export class PatientUserDto {
  id!: string
  fullName!: string
  email!: string
  isActive!: boolean
}

export class PatientResponsibleRefDto {
  id!: string
  fullName!: string
  documentNumber!: string | null
}

export class PatientDependentRefDto {
  id!: string
  fullName!: string
  kinshipType!: KinshipType
}

export class PatientResponseDto {
  id!: string
  user!: PatientUserDto
  documentNumber!: string | null
  phoneNumber!: string
  birthDate!: string
  gender!: PatientGender
  responsiblePatientId!: string | null
  kinshipType!: KinshipType | null
  responsiblePatient!: PatientResponsibleRefDto | null
  dependents!: PatientDependentRefDto[]
  createdAt!: Date
  updatedAt!: Date
}
