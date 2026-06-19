import { appointmentsService } from '../services/appointments.service'
import { toAppointmentModel } from '../mappers/to-appointment-model.mapper'
import type { IAppointmentModel } from '../types/appointment-model.types'

export async function getAppointmentUseCase(id: string): Promise<IAppointmentModel> {
  const dto = await appointmentsService.getById(id)
  return toAppointmentModel(dto)
}
