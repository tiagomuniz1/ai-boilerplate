export interface ExamRequestSnapshot {
  issuedAt: string
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
  items: Array<{ name: string; observations: string | null }>
  notes: string | null
}
