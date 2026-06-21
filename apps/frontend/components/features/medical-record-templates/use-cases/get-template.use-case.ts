import { medicalRecordTemplatesService } from '../services/medical-record-templates.service'
import { toTemplateModel } from '../mappers/to-template-model.mapper'
import type { ITemplateModel } from '../types/template-model.types'

export async function getTemplateUseCase(id: string): Promise<ITemplateModel> {
  const dto = await medicalRecordTemplatesService.getById(id)
  return toTemplateModel(dto)
}
