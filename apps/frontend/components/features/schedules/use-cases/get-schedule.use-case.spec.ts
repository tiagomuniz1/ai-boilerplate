jest.mock('../services/schedules.service')
jest.mock('../mappers/to-schedule-model.mapper')

import { DayOfWeek } from '@app/shared'
import { schedulesService } from '../services/schedules.service'
import { toScheduleModel } from '../mappers/to-schedule-model.mapper'
import { getScheduleUseCase } from './get-schedule.use-case'
import type { IScheduleModel } from '../types/schedule-model.types'

const makeDto = () => ({
  id: 'uuid-1',
  doctorId: 'doc-uuid',
  dayOfWeek: DayOfWeek.MONDAY,
  startTime: '08:00',
  endTime: '12:00',
  slotDurationInMinutes: 30,
  validFrom: null,
  validUntil: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

const makeModel = (): IScheduleModel => ({ ...makeDto(), createdAt: new Date(), updatedAt: new Date() })

describe('getScheduleUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls schedulesService.getById with the given id', async () => {
    const dto = makeDto()
    ;(schedulesService.getById as jest.Mock).mockResolvedValue(dto)
    ;(toScheduleModel as jest.Mock).mockReturnValue(makeModel())

    await getScheduleUseCase('uuid-1')

    expect(schedulesService.getById).toHaveBeenCalledWith('uuid-1')
  })

  it('returns the mapped model', async () => {
    const dto = makeDto()
    const model = makeModel()
    ;(schedulesService.getById as jest.Mock).mockResolvedValue(dto)
    ;(toScheduleModel as jest.Mock).mockReturnValue(model)

    const result = await getScheduleUseCase('uuid-1')

    expect(toScheduleModel).toHaveBeenCalledWith(dto)
    expect(result).toBe(model)
  })

  it('propagates errors from schedulesService.getById', async () => {
    ;(schedulesService.getById as jest.Mock).mockRejectedValue({ status: 404 })

    await expect(getScheduleUseCase('uuid-1')).rejects.toEqual({ status: 404 })
  })
})
