import { appointmentsService } from '../services/appointments.service'
import { toAppointmentDetailModel } from '../mappers/to-appointment-detail-model.mapper'
import type { IAppointmentDetailModel } from '../types/appointment-model.types'

export async function getAppointmentUseCase(id: string): Promise<IAppointmentDetailModel> {
  const dto = await appointmentsService.getById(id)
  return toAppointmentDetailModel(dto)
}
