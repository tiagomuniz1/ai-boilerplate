import { vaccineIndicationsService } from '../services/vaccine-indications.service'
import { toVaccineIndicationModel } from '../mappers/to-vaccine-indication-model.mapper'
import type { IVaccineIndicationModel } from '../types/vaccine-indication-model.types'

export async function listVaccineIndicationsUseCase(
  appointmentId: string,
): Promise<IVaccineIndicationModel[]> {
  const dtos = await vaccineIndicationsService.getByAppointment(appointmentId)
  return dtos.map(toVaccineIndicationModel)
}
