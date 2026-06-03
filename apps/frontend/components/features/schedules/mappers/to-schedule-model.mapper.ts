import type { ScheduleResponseDto } from '@app/shared'
import type { IScheduleModel } from '../types/schedule-model.types'

export function toScheduleModel(dto: ScheduleResponseDto): IScheduleModel {
  return {
    id: dto.id,
    doctorId: dto.doctorId,
    doctorName: dto.doctorName,
    dayOfWeek: dto.dayOfWeek,
    startTime: dto.startTime,
    endTime: dto.endTime,
    slotDurationInMinutes: dto.slotDurationInMinutes,
    validFrom: dto.validFrom,
    validUntil: dto.validUntil,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  }
}
