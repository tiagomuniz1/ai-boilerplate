import { medicalRecordTemplatesService } from '../services/medical-record-templates.service'
import { toCreateTemplateDto } from '../mappers/to-create-template-dto.mapper'
import { toTemplateModel } from '../mappers/to-template-model.mapper'
import type { ITemplateModel } from '../types/template-model.types'
import type { ICreateTemplateInput } from '../types/template-input.types'

export async function createTemplateUseCase(input: ICreateTemplateInput): Promise<ITemplateModel> {
  const dto = await medicalRecordTemplatesService.create(toCreateTemplateDto(input))
  return toTemplateModel(dto)
}
