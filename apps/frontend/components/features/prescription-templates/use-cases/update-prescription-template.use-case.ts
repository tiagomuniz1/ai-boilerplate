import type { IUpdatePrescriptionTemplateInput } from '../types/prescription-template-input.types'
import type { IPrescriptionTemplateModel } from '../types/prescription-template-model.types'
import { prescriptionTemplatesService } from '../services/prescription-templates.service'
import { toPrescriptionTemplateModel } from '../mappers/to-prescription-template-model.mapper'

export async function updatePrescriptionTemplateUseCase(
  id: string,
  input: IUpdatePrescriptionTemplateInput,
): Promise<IPrescriptionTemplateModel> {
  const dto = {
    ...(input.name !== undefined && { name: input.name }),
    ...(input.notes !== undefined && { notes: input.notes }),
    ...(input.isActive !== undefined && { isActive: input.isActive }),
    ...(input.doctorId !== undefined && { doctorId: input.doctorId }),
    ...(input.items !== undefined && {
      items: input.items.map((item) => ({
        ...(item.medicationId ? { medicationId: item.medicationId } : {}),
        ...(item.activeIngredientName ? { activeIngredientName: item.activeIngredientName } : {}),
        ...(item.dosage ? { dosage: item.dosage } : {}),
        ...(item.quantity ? { quantity: item.quantity } : {}),
        instructions: item.instructions,
      })),
    }),
  }
  const response = await prescriptionTemplatesService.update(id, dto as any)
  return toPrescriptionTemplateModel(response)
}
