import type { CreatePrescriptionDto } from '@app/shared'
import type { ICreatePrescriptionInput } from '../types/prescription-input.types'

export function toCreatePrescriptionDto(input: ICreatePrescriptionInput): CreatePrescriptionDto {
  return {
    appointmentId: input.appointmentId,
    ...(input.crmId ? { crmId: input.crmId } : {}),
    ...(input.specialtyId ? { specialtyId: input.specialtyId } : {}),
    items: input.items.map((item) => ({
      ...(item.medicationId ? { medicationId: item.medicationId } : {}),
      ...(item.activeIngredientName ? { activeIngredientName: item.activeIngredientName } : {}),
      ...(item.dosage ? { dosage: item.dosage } : {}),
      ...(item.quantity ? { quantity: item.quantity } : {}),
      instructions: item.instructions,
    })),
    ...(input.notes ? { notes: input.notes } : {}),
  } as CreatePrescriptionDto
}
