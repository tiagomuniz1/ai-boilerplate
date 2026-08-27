import { appointmentsService } from '../services/appointments.service'
import { toBookRecurringAppointmentsDto } from '../mappers/to-book-recurring-appointments-dto.mapper'
import { toRecurringAppointmentsResultModel } from '../mappers/to-recurring-appointments-result-model.mapper'
import type { IBookRecurringAppointmentsInput } from '../types/appointment-input.types'
import type { IRecurringAppointmentsResultModel } from '../types/appointment-model.types'

export async function bookRecurringAppointmentsUseCase(
  input: IBookRecurringAppointmentsInput,
): Promise<IRecurringAppointmentsResultModel> {
  const dto = await appointmentsService.bookRecurring(toBookRecurringAppointmentsDto(input))
  return toRecurringAppointmentsResultModel(dto)
}
