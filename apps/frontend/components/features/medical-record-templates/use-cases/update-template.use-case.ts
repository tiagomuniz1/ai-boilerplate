import { medicalRecordTemplatesService } from '../services/medical-record-templates.service'
import { toUpdateTemplateDto } from '../mappers/to-update-template-dto.mapper'
import { toTemplateModel } from '../mappers/to-template-model.mapper'
import type { ITemplateModel } from '../types/template-model.types'
import type { IUpdateTemplateInput } from '../types/template-input.types'

export async function updateTemplateUseCase(
  id: string,
  input: IUpdateTemplateInput,
): Promise<ITemplateModel> {
  const dto = await medicalRecordTemplatesService.update(id, toUpdateTemplateDto(input))
  return toTemplateModel(dto)
}
