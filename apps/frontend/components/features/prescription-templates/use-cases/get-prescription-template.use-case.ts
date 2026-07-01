import type { IPrescriptionTemplateModel } from '../types/prescription-template-model.types'
import { prescriptionTemplatesService } from '../services/prescription-templates.service'
import { toPrescriptionTemplateModel } from '../mappers/to-prescription-template-model.mapper'

export async function getPrescriptionTemplateUseCase(id: string): Promise<IPrescriptionTemplateModel> {
  const dto = await prescriptionTemplatesService.getById(id)
  return toPrescriptionTemplateModel(dto)
}
