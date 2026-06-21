import { medicalRecordsService } from '../services/medical-records.service'
import { toMedicalRecordModel } from '../mappers/to-medical-record-model.mapper'
import type { IMedicalRecordModel } from '../types/medical-record-model.types'

export async function getMedicalRecordUseCase(id: string): Promise<IMedicalRecordModel> {
  const dto = await medicalRecordsService.getById(id)
  return toMedicalRecordModel(dto)
}
