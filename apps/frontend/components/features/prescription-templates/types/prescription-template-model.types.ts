export interface IPrescriptionTemplateItemModel {
  medicationId: string | null
  name: string
  activeIngredient: string | null
  dosage: string | null
  quantity: string | null
  instructions: string
}

export interface IPrescriptionTemplateModel {
  id: string
  professionalId: string
  professionalName: string
  name: string
  items: IPrescriptionTemplateItemModel[]
  notes: string | null
  isActive: boolean
  createdAt: Date
}
