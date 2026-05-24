import type { IScheduleModel } from '../types/schedule-model.types'
import { schedulesService } from '../services/schedules.service'
import { toScheduleModel } from '../mappers/to-schedule-model.mapper'

export async function getScheduleUseCase(id: string): Promise<IScheduleModel> {
  const dto = await schedulesService.getById(id)
  return toScheduleModel(dto)
}
