import type { IPrescriptionTemplateModel } from '../types/prescription-template-model.types'
import { prescriptionTemplatesService } from '../services/prescription-templates.service'
import { toPrescriptionTemplateModel } from '../mappers/to-prescription-template-model.mapper'

export async function listPrescriptionTemplatesUseCase(params?: { doctorId?: string }): Promise<IPrescriptionTemplateModel[]> {
  const dtos = await prescriptionTemplatesService.getAll(params)
  return dtos.map(toPrescriptionTemplateModel)
}
