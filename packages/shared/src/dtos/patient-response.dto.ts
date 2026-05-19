import { PatientGender } from '../enums/patient-gender.enum'

export class PatientUserDto {
  id!: string
  fullName!: string
  email!: string
  isActive!: boolean
}

export class PatientResponseDto {
  id!: string
  user!: PatientUserDto
  documentNumber!: string
  phoneNumber!: string
  birthDate!: string
  gender!: PatientGender
  createdAt!: Date
  updatedAt!: Date
}
