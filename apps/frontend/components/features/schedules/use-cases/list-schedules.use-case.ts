import type { IPaginatedSchedulesModel } from '../types/schedule-model.types'
import type { IScheduleListParams } from '../types/schedule-input.types'
import { schedulesService } from '../services/schedules.service'
import { toScheduleModel } from '../mappers/to-schedule-model.mapper'

export async function listSchedulesUseCase(params?: IScheduleListParams): Promise<IPaginatedSchedulesModel> {
  const response = await schedulesService.getAll(params)
  return {
    data: response.data.map(toScheduleModel),
    total: response.total,
    page: response.page,
    limit: response.limit,
  }
}
