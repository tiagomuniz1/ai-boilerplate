import { appointmentsService } from '../services/appointments.service'
import { toAppointmentSeriesModel } from '../mappers/to-appointment-series-model.mapper'
import type { IAppointmentSeriesModel } from '../types/appointment-model.types'

export async function getAppointmentSeriesUseCase(seriesId: string): Promise<IAppointmentSeriesModel> {
  const dto = await appointmentsService.getSeries(seriesId)
  return toAppointmentSeriesModel(dto)
}
