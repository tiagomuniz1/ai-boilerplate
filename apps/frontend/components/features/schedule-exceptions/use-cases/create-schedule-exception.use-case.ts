import { scheduleExceptionsService } from '../services/schedule-exceptions.service'
import { toScheduleExceptionModel } from '../mappers/to-schedule-exception-model.mapper'
import type { ICreateScheduleExceptionInput } from '../types/schedule-exception-input.types'
import type { IScheduleExceptionModel } from '../types/schedule-exception-model.types'

export async function createScheduleExceptionUseCase(
  input: ICreateScheduleExceptionInput,
): Promise<IScheduleExceptionModel> {
  const dto = await scheduleExceptionsService.create({
    doctorId: input.doctorId,
    date: input.date,
    startTime: input.startTime ?? null,
    endTime: input.endTime ?? null,
    reason: input.reason ?? null,
  })
  return toScheduleExceptionModel(dto)
}
