import { medicalRecordTemplatesService } from '../services/medical-record-templates.service'

export async function deleteTemplateUseCase(id: string): Promise<void> {
  return medicalRecordTemplatesService.remove(id)
}
