export interface PrescriptionSnapshot {
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
  items: Array<{
    medicationId: string | null
    name: string
    activeIngredient: string | null
    instructions: string
  }>
  notes: string | null
}
