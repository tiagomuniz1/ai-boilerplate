import { scheduleExceptionsService } from '../services/schedule-exceptions.service'
import { toScheduleExceptionModel } from '../mappers/to-schedule-exception-model.mapper'
import type { IScheduleExceptionListParams } from '../types/schedule-exception-input.types'
import type { IScheduleExceptionModel } from '../types/schedule-exception-model.types'

export async function listScheduleExceptionsUseCase(
  params?: IScheduleExceptionListParams,
): Promise<IScheduleExceptionModel[]> {
  const response = await scheduleExceptionsService.getAll(params)
  return response.data.map(toScheduleExceptionModel)
}
