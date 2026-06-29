import { prescriptionsService } from '../services/prescriptions.service'
import { toPrescriptionModel } from '../mappers/to-prescription-model.mapper'
import type { IPrescriptionModel } from '../types/prescription-model.types'

export async function listPrescriptionsUseCase(appointmentId: string): Promise<IPrescriptionModel[]> {
  const dtos = await prescriptionsService.getByAppointment(appointmentId)
  return dtos.map(toPrescriptionModel)
}
