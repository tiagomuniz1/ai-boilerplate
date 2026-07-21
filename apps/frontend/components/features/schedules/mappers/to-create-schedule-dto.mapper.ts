import type { CreateScheduleDto } from '@app/shared'
import type { ICreateScheduleInput } from '../types/schedule-input.types'

export function toCreateScheduleDto(input: ICreateScheduleInput): CreateScheduleDto {
  return {
    professionalId: input.professionalId,
    dayOfWeek: input.dayOfWeek,
    startTime: input.startTime,
    endTime: input.endTime,
    slotDurationInMinutes: input.slotDurationInMinutes,
    validFrom: input.validFrom || undefined,
    validUntil: input.validUntil || undefined,
  }
}
