import type { AvailableSlotDto } from '@app/shared'
import type { IAvailableSlotModel } from '../types/appointment-model.types'

export function toAvailableSlotModel(dto: AvailableSlotDto): IAvailableSlotModel {
  return {
    startTime: dto.startTime,
    endTime: dto.endTime,
    scheduleId: dto.scheduleId,
    slotDurationInMinutes: dto.slotDurationInMinutes,
  }
}
