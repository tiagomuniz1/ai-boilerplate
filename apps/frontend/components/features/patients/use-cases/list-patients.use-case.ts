import { patientsService } from '../services/patients.service'
import { toPatientModel } from '../mappers/to-patient-model.mapper'
import type { IPatientModel } from '../types/patient-model.types'
import type { IPatientListParams } from '../types/patient-input.types'

export async function listPatientsUseCase(
  params?: IPatientListParams,
): Promise<IPatientModel[]> {
  const { data } = await patientsService.getAll(params)
  return data.map(toPatientModel)
}
