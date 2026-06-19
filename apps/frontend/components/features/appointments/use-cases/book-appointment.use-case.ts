import { appointmentsService } from '../services/appointments.service'
import { toBookAppointmentDto } from '../mappers/to-book-appointment-dto.mapper'
import { toAppointmentModel } from '../mappers/to-appointment-model.mapper'
import type { IBookAppointmentInput } from '../types/appointment-input.types'
import type { IAppointmentModel } from '../types/appointment-model.types'

export async function bookAppointmentUseCase(input: IBookAppointmentInput): Promise<IAppointmentModel> {
  const dto = toBookAppointmentDto(input)
  const response = await appointmentsService.book(dto)
  return toAppointmentModel(response)
}
