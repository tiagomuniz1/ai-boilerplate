import { appointmentsService } from '../services/appointments.service'
import { toAppointmentModel } from '../mappers/to-appointment-model.mapper'
import type { ICancelAppointmentInput } from '../types/appointment-input.types'
import type { IAppointmentModel } from '../types/appointment-model.types'

export async function cancelAppointmentUseCase(
  id: string,
  input: ICancelAppointmentInput,
): Promise<IAppointmentModel> {
  const response = await appointmentsService.cancel(id, {
    cancellationReason: input.cancellationReason,
  })
  return toAppointmentModel(response)
}
