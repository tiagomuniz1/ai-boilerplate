import { patientsService } from '../services/patients.service'

export async function deletePatientUseCase(id: string): Promise<void> {
  return patientsService.remove(id)
}
