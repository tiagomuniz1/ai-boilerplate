import { scheduleExceptionsService } from '../services/schedule-exceptions.service'

export async function deleteScheduleExceptionUseCase(id: string): Promise<void> {
  await scheduleExceptionsService.remove(id)
}
