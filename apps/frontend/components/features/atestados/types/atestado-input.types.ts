import type { MedicalCertificateType } from '@app/shared'

export interface ICreateAtestadoInput {
  appointmentId: string
  type: MedicalCertificateType
  daysOff?: number
  startDate?: string
  cidCode?: string
  attendanceDate?: string
  checkInTime?: string
  checkOutTime?: string
  observations?: string
}
