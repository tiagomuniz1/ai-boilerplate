import { patientsService } from '../services/patients.service'
import { toPatientModel } from '../mappers/to-patient-model.mapper'
import type { IPatientModel } from '../types/patient-model.types'

export async function getPatientUseCase(id: string): Promise<IPatientModel> {
  const dto = await patientsService.getById(id)
  return toPatientModel(dto)
}
