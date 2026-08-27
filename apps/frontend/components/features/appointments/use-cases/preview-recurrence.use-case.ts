import { appointmentsService } from '../services/appointments.service'
import { toRecurrencePreviewDto } from '../mappers/to-recurrence-preview-dto.mapper'
import { toRecurrencePreviewModel } from '../mappers/to-recurrence-preview-model.mapper'
import type { IRecurrencePreviewInput } from '../types/appointment-input.types'
import type { IRecurrencePreviewModel } from '../types/appointment-model.types'

export async function previewRecurrenceUseCase(
  input: IRecurrencePreviewInput,
): Promise<IRecurrencePreviewModel> {
  const dto = await appointmentsService.previewRecurrence(toRecurrencePreviewDto(input))
  return toRecurrencePreviewModel(dto)
}
