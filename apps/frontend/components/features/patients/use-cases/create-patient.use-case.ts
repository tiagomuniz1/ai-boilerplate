import { patientsService } from '../services/patients.service'
import { toPatientModel } from '../mappers/to-patient-model.mapper'
import { toCreatePatientDto } from '../mappers/to-create-patient-dto.mapper'
import type { IPatientModel } from '../types/patient-model.types'
import type { ICreatePatientInput } from '../types/patient-input.types'

export async function createPatientUseCase(
  input: ICreatePatientInput,
): Promise<IPatientModel> {
  const dto = await patientsService.create(toCreatePatientDto(input))
  return toPatientModel(dto)
}
