import type { ICreatePrescriptionTemplateInput } from '../types/prescription-template-input.types'
import type { IPrescriptionTemplateModel } from '../types/prescription-template-model.types'
import { prescriptionTemplatesService } from '../services/prescription-templates.service'
import { toCreatePrescriptionTemplateDto } from '../mappers/to-create-prescription-template-dto.mapper'
import { toPrescriptionTemplateModel } from '../mappers/to-prescription-template-model.mapper'

export async function createPrescriptionTemplateUseCase(input: ICreatePrescriptionTemplateInput): Promise<IPrescriptionTemplateModel> {
  const dto = toCreatePrescriptionTemplateDto(input)
  const response = await prescriptionTemplatesService.create(dto)
  return toPrescriptionTemplateModel(response)
}
