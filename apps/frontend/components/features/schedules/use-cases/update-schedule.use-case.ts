import type { IScheduleModel } from '../types/schedule-model.types'
import type { IUpdateScheduleInput } from '../types/schedule-input.types'
import { schedulesService } from '../services/schedules.service'
import { toUpdateScheduleDto } from '../mappers/to-update-schedule-dto.mapper'
import { toScheduleModel } from '../mappers/to-schedule-model.mapper'

export async function updateScheduleUseCase(id: string, input: IUpdateScheduleInput): Promise<IScheduleModel> {
  const dto = toUpdateScheduleDto(input)
  const response = await schedulesService.update(id, dto)
  return toScheduleModel(response)
}
