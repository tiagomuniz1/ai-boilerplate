import { prescriptionTemplatesService } from '../services/prescription-templates.service'

export async function deletePrescriptionTemplateUseCase(id: string): Promise<void> {
  return prescriptionTemplatesService.remove(id)
}
