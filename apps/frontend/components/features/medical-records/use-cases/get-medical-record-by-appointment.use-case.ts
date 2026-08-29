import type { IApiError } from '@/types/api.types'
import { medicalRecordsService } from '../services/medical-records.service'
import { toMedicalRecordModel } from '../mappers/to-medical-record-model.mapper'
import type { IMedicalRecordModel } from '../types/medical-record-model.types'

export async function getMedicalRecordByAppointmentUseCase(
  appointmentId: string,
): Promise<IMedicalRecordModel | null> {
  let dto
  try {
    dto = await medicalRecordsService.getByAppointment(appointmentId)
  } catch (error) {
    // The endpoint answers 404 for "this appointment has no prontuário yet",
    // which is the ordinary case, not a failure. Letting it reach React Query as
    // an error makes every appointment without a record look broken to the UI.
    if ((error as IApiError)?.status === 404) return null
    throw error
  }
  if (!dto) return null
  return toMedicalRecordModel(dto)
}
