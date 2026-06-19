import { appointmentsService } from '../services/appointments.service'
import { toAppointmentModel } from '../mappers/to-appointment-model.mapper'
import type { IAppointmentListParams } from '../types/appointment-input.types'
import type { IPaginatedAppointmentsModel } from '../types/appointment-model.types'

export async function listAppointmentsUseCase(
  params?: IAppointmentListParams,
): Promise<IPaginatedAppointmentsModel> {
  const response = await appointmentsService.getAll(params)
  return {
    data: response.data.map(toAppointmentModel),
    total: response.total,
    page: response.page,
    limit: response.limit,
  }
}
