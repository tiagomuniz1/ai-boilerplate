import { PatientGender } from '../enums/patient-gender.enum'

export class AppointmentPatientDto {
  fullName: string
  email: string
  phoneNumber: string
  birthDate: string
  documentNumber: string | null
  gender: PatientGender
}
