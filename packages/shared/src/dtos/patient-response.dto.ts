import { PatientGender } from '../enums/patient-gender.enum'

export class PatientResponseDto {
  id!: string
  fullName!: string
  documentNumber!: string
  email!: string
  phoneNumber!: string
  birthDate!: string
  gender!: PatientGender
  createdAt!: Date
  updatedAt!: Date
}
