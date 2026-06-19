import { appointmentsService } from '../services/appointments.service'
import { toAppointmentModel } from '../mappers/to-appointment-model.mapper'
import type { IAppointmentModel } from '../types/appointment-model.types'

export async function completeAppointmentUseCase(id: string): Promise<IAppointmentModel> {
  const response = await appointmentsService.complete(id)
  return toAppointmentModel(response)
}
