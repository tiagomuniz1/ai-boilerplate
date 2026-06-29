import type { CreatePrescriptionDto } from '@app/shared'
import type { ICreatePrescriptionInput } from '../types/prescription-input.types'

export function toCreatePrescriptionDto(input: ICreatePrescriptionInput): CreatePrescriptionDto {
  return {
    appointmentId: input.appointmentId,
    items: input.items.map((item) => ({
      medicationId: item.medicationId,
      instructions: item.instructions,
    })),
    ...(input.notes ? { notes: input.notes } : {}),
  } as CreatePrescriptionDto
}
