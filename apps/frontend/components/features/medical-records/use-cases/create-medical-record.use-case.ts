import { medicalRecordsService } from '../services/medical-records.service'
import { toCreateMedicalRecordDto } from '../mappers/to-create-medical-record-dto.mapper'
import { toMedicalRecordModel } from '../mappers/to-medical-record-model.mapper'
import type { IMedicalRecordModel } from '../types/medical-record-model.types'
import type { ICreateMedicalRecordInput } from '../types/medical-record-input.types'

export async function createMedicalRecordUseCase(
  input: ICreateMedicalRecordInput,
): Promise<IMedicalRecordModel> {
  const dto = await medicalRecordsService.create(toCreateMedicalRecordDto(input))
  return toMedicalRecordModel(dto)
}
