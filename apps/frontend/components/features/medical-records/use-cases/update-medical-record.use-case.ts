import { medicalRecordsService } from '../services/medical-records.service'
import { toUpdateMedicalRecordDto } from '../mappers/to-update-medical-record-dto.mapper'
import { toMedicalRecordModel } from '../mappers/to-medical-record-model.mapper'
import type { IMedicalRecordModel } from '../types/medical-record-model.types'
import type { IUpdateMedicalRecordInput } from '../types/medical-record-input.types'

export async function updateMedicalRecordUseCase(
  id: string,
  input: IUpdateMedicalRecordInput,
): Promise<IMedicalRecordModel> {
  const dto = await medicalRecordsService.update(id, toUpdateMedicalRecordDto(input))
  return toMedicalRecordModel(dto)
}
