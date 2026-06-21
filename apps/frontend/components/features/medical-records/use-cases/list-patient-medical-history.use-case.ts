import { medicalRecordsService, type IPatientHistoryParams } from '../services/medical-records.service'
import { toPaginatedMedicalRecordsModel } from '../mappers/to-medical-record-model.mapper'
import type { IPaginatedMedicalRecordsModel } from '../types/medical-record-model.types'

export async function listPatientMedicalHistoryUseCase(
  patientId: string,
  params?: IPatientHistoryParams,
): Promise<IPaginatedMedicalRecordsModel> {
  const dto = await medicalRecordsService.listByPatient(patientId, params)
  return toPaginatedMedicalRecordsModel(dto)
}
