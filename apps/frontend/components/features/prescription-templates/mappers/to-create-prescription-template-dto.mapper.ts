import type { CreatePrescriptionTemplateDto } from '@app/shared'
import type { ICreatePrescriptionTemplateInput } from '../types/prescription-template-input.types'

export function toCreatePrescriptionTemplateDto(input: ICreatePrescriptionTemplateInput): CreatePrescriptionTemplateDto {
  return {
    name: input.name,
    items: input.items.map((item) => ({
      ...(item.medicationId ? { medicationId: item.medicationId } : {}),
      ...(item.activeIngredientName ? { activeIngredientName: item.activeIngredientName } : {}),
      ...(item.dosage ? { dosage: item.dosage } : {}),
      ...(item.quantity ? { quantity: item.quantity } : {}),
      instructions: item.instructions,
    })),
    ...(input.notes ? { notes: input.notes } : {}),
    ...(input.doctorId ? { doctorId: input.doctorId } : {}),
  } as CreatePrescriptionTemplateDto
}
