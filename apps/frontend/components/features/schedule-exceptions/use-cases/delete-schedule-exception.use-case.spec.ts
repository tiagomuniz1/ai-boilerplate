jest.mock('../services/schedule-exceptions.service')

import { deleteScheduleExceptionUseCase } from './delete-schedule-exception.use-case'
import { scheduleExceptionsService } from '../services/schedule-exceptions.service'

const mockService = scheduleExceptionsService as jest.Mocked<typeof scheduleExceptionsService>

describe('deleteScheduleExceptionUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls service remove with the exception id', async () => {
    mockService.remove.mockResolvedValue(undefined)

    await deleteScheduleExceptionUseCase('exc-uuid')

    expect(mockService.remove).toHaveBeenCalledWith('exc-uuid')
  })

  it('propagates errors from the service', async () => {
    const error = new Error('Network error')
    mockService.remove.mockRejectedValue(error)

    await expect(deleteScheduleExceptionUseCase('exc-uuid')).rejects.toThrow('Network error')
  })
})
