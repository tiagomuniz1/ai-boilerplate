import { medicalRecordsService } from '../services/medical-records.service'
import { toMedicalRecordModel } from '../mappers/to-medical-record-model.mapper'
import type { IMedicalRecordModel } from '../types/medical-record-model.types'

export async function getMedicalRecordByAppointmentUseCase(
  appointmentId: string,
): Promise<IMedicalRecordModel | null> {
  const dto = await medicalRecordsService.getByAppointment(appointmentId)
  if (!dto) return null
  return toMedicalRecordModel(dto)
}
