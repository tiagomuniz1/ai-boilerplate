import { schedulesService } from '../services/schedules.service'

export async function deleteScheduleUseCase(id: string): Promise<void> {
  await schedulesService.remove(id)
}
