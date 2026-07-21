import type { ScheduleExceptionResponseDto } from '@app/shared'
import type { IScheduleExceptionModel } from '../types/schedule-exception-model.types'

export function toScheduleExceptionModel(dto: ScheduleExceptionResponseDto): IScheduleExceptionModel {
  return {
    id: dto.id,
    professionalId: dto.professionalId,
    date: dto.date,
    startTime: dto.startTime,
    endTime: dto.endTime,
    reason: dto.reason,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  }
}
