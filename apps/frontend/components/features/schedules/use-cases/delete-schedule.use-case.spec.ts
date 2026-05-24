jest.mock('../services/schedules.service')

import { schedulesService } from '../services/schedules.service'
import { deleteScheduleUseCase } from './delete-schedule.use-case'

describe('deleteScheduleUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls schedulesService.remove with the given id', async () => {
    ;(schedulesService.remove as jest.Mock).mockResolvedValue(undefined)

    await deleteScheduleUseCase('uuid-1')

    expect(schedulesService.remove).toHaveBeenCalledWith('uuid-1')
  })

  it('resolves to undefined on success', async () => {
    ;(schedulesService.remove as jest.Mock).mockResolvedValue(undefined)

    await expect(deleteScheduleUseCase('uuid-1')).resolves.toBeUndefined()
  })

  it('propagates errors from schedulesService.remove', async () => {
    ;(schedulesService.remove as jest.Mock).mockRejectedValue({ status: 404 })

    await expect(deleteScheduleUseCase('uuid-1')).rejects.toEqual({ status: 404 })
  })
})
