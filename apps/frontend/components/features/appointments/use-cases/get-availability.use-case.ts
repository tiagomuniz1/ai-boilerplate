import { appointmentsService } from '../services/appointments.service'
import { toAvailableSlotModel } from '../mappers/to-available-slot-model.mapper'
import type { IAvailabilityParams } from '../types/appointment-input.types'
import type { IAvailableSlotModel } from '../types/appointment-model.types'

export async function getAvailabilityUseCase(
  params: IAvailabilityParams,
): Promise<IAvailableSlotModel[]> {
  const response = await appointmentsService.getAvailability(params)
  return response.slots.map(toAvailableSlotModel)
}
