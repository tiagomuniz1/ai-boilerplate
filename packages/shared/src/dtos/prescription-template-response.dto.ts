export class PrescriptionTemplateItemResponseDto {
  medicationId!: string | null
  name!: string
  activeIngredient!: string | null
  dosage!: string | null
  quantity!: string | null
  instructions!: string
}

export class PrescriptionTemplateResponseDto {
  id!: string
  professionalId!: string
  professionalName!: string
  name!: string
  items!: PrescriptionTemplateItemResponseDto[]
  notes!: string | null
  isActive!: boolean
  createdAt!: Date
}
