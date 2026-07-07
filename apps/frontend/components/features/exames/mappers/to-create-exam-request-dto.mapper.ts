import type { CreateExamRequestDto } from '@app/shared'
import type { ICreateExamRequestInput } from '../types/exam-request-input.types'

export function toCreateExamRequestDto(input: ICreateExamRequestInput): CreateExamRequestDto {
  return {
    appointmentId: input.appointmentId,
    ...(input.crmId ? { crmId: input.crmId } : {}),
    ...(input.specialtyId ? { specialtyId: input.specialtyId } : {}),
    items: input.items.map((item) => ({
      name: item.name,
      ...(item.observations ? { observations: item.observations } : {}),
    })),
    ...(input.notes ? { notes: input.notes } : {}),
  } as CreateExamRequestDto
}
