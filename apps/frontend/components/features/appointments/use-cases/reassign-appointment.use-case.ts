import { appointmentsService } from '../services/appointments.service'
import { toAppointmentModel } from '../mappers/to-appointment-model.mapper'
import type { IAppointmentModel } from '../types/appointment-model.types'

export async function reassignAppointmentUseCase(
  id: string,
  professionalId: string,
): Promise<IAppointmentModel> {
  const response = await appointmentsService.reassign(id, professionalId)
  return toAppointmentModel(response)
}
