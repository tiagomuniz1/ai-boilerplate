import { patientsService } from '../services/patients.service'
import { toPatientModel } from '../mappers/to-patient-model.mapper'
import { toUpdatePatientDto } from '../mappers/to-update-patient-dto.mapper'
import type { IPatientModel } from '../types/patient-model.types'
import type { IUpdatePatientInput } from '../types/patient-input.types'

export async function updatePatientUseCase(
  id: string,
  input: IUpdatePatientInput,
): Promise<IPatientModel> {
  const dto = await patientsService.update(id, toUpdatePatientDto(input))
  return toPatientModel(dto)
}
