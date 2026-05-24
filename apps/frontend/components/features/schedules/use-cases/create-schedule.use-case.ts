import type { IScheduleModel } from '../types/schedule-model.types'
import type { ICreateScheduleInput } from '../types/schedule-input.types'
import { schedulesService } from '../services/schedules.service'
import { toCreateScheduleDto } from '../mappers/to-create-schedule-dto.mapper'
import { toScheduleModel } from '../mappers/to-schedule-model.mapper'

export async function createScheduleUseCase(input: ICreateScheduleInput): Promise<IScheduleModel> {
  const dto = toCreateScheduleDto(input)
  const response = await schedulesService.create(dto)
  return toScheduleModel(response)
}
