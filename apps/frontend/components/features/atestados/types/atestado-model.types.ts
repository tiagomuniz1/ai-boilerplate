import type { MedicalCertificateType } from '@app/shared'

export interface IAtestadoModel {
  id: string
  appointmentId: string
  patientId: string
  patientName: string
  professionalId: string
  professionalName: string
  type: MedicalCertificateType
  daysOff: number | null
  // Calendar dates, kept as `YYYY-MM-DD` exactly as the API sends them. Parsing
  // them into a Date makes JS read them as UTC midnight, which renders as the
  // previous day in UTC-3 — on a sick note that is a legally wrong date.
  startDate: string | null
  cidCode: string | null
  attendanceDate: string | null
  checkInTime: string | null
  checkOutTime: string | null
  observations: string | null
  issuedAt: Date
  createdAt: Date
}
