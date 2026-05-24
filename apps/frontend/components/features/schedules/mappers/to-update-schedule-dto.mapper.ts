import type { UpdateScheduleDto } from '@app/shared'
import type { IUpdateScheduleInput } from '../types/schedule-input.types'

export function toUpdateScheduleDto(input: IUpdateScheduleInput): UpdateScheduleDto {
  return {
    dayOfWeek: input.dayOfWeek,
    startTime: input.startTime,
    endTime: input.endTime,
    slotDurationInMinutes: input.slotDurationInMinutes,
    validFrom: input.validFrom,
    validUntil: input.validUntil,
  }
}
