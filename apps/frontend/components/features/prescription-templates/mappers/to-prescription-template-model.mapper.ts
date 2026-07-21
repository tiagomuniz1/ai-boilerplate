import type { PrescriptionTemplateResponseDto } from '@app/shared'
import type { IPrescriptionTemplateModel } from '../types/prescription-template-model.types'

export function toPrescriptionTemplateModel(dto: PrescriptionTemplateResponseDto): IPrescriptionTemplateModel {
  return {
    id: dto.id,
    professionalId: dto.professionalId,
    professionalName: dto.professionalName,
    name: dto.name,
    items: dto.items.map((item) => ({
      medicationId: item.medicationId,
      name: item.name,
      activeIngredient: item.activeIngredient,
      dosage: item.dosage,
      quantity: item.quantity,
      instructions: item.instructions,
    })),
    notes: dto.notes,
    isActive: dto.isActive,
    createdAt: new Date(dto.createdAt as unknown as string),
  }
}
