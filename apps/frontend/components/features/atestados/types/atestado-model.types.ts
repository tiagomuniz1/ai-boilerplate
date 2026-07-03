import type { MedicalCertificateType } from '@app/shared'

export interface IAtestadoModel {
  id: string
  appointmentId: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  type: MedicalCertificateType
  daysOff: number | null
  startDate: Date | null
  cidCode: string | null
  attendanceDate: Date | null
  checkInTime: string | null
  checkOutTime: string | null
  observations: string | null
  issuedAt: Date
  createdAt: Date
}
