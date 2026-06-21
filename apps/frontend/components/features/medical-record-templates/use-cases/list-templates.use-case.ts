import { medicalRecordTemplatesService } from '../services/medical-record-templates.service'
import { toPaginatedTemplatesModel } from '../mappers/to-template-model.mapper'
import type { IPaginatedTemplatesModel } from '../types/template-model.types'
import type { ITemplateListParams } from '../services/medical-record-templates.service'

export async function listTemplatesUseCase(params?: ITemplateListParams): Promise<IPaginatedTemplatesModel> {
  const dto = await medicalRecordTemplatesService.getAll(params)
  return toPaginatedTemplatesModel(dto)
}
