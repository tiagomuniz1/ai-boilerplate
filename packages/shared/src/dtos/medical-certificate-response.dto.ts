import { MedicalCertificateType } from '../enums/medical-certificate-type.enum'

export class MedicalCertificateResponseDto {
  id!: string
  appointmentId!: string
  patientId!: string
  patientName!: string
  doctorId!: string
  doctorName!: string
  type!: MedicalCertificateType
  daysOff!: number | null
  startDate!: string | null
  cidCode!: string | null
  attendanceDate!: string | null
  checkInTime!: string | null
  checkOutTime!: string | null
  observations!: string | null
  issuedAt!: Date
  createdAt!: Date
}
