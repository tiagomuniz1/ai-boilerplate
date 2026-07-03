import { MedicalCertificateType } from '../enums/medical-certificate-type.enum'

export interface MedicalCertificateSnapshot {
  issuedAt: string
  type: MedicalCertificateType
  clinic: {
    name: string
    address: {
      street: string | null
      number: string | null
      complement: string | null
      neighborhood: string | null
      city: string | null
      state: string | null
      zipCode: string | null
    } | null
    logoUrl: string | null
  }
  doctor: { name: string; crmNumber: string; specialtyName: string | null }
  patient: { name: string; documentNumber: string }
  daysOff: number | null
  startDate: string | null
  cidCode: string | null
  attendanceDate: string | null
  checkInTime: string | null
  checkOutTime: string | null
  observations: string | null
}
