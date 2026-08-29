jest.mock('../services/schedules.service')
jest.mock('../mappers/to-schedule-model.mapper')

import { DayOfWeek } from '@app/shared'
import { schedulesService } from '../services/schedules.service'
import { toScheduleModel } from '../mappers/to-schedule-model.mapper'
import { listSchedulesUseCase } from './list-schedules.use-case'
import type { IScheduleModel } from '../types/schedule-model.types'

const makeDto = (id = 'uuid-1') => ({
  id,
  professionalId: 'doc-uuid',
  professionalName: 'Dr. Test',
  dayOfWeek: DayOfWeek.MONDAY,
  startTime: '08:00',
  endTime: '12:00',
  slotDurationInMinutes: 30,
  validFrom: null,
  validUntil: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

const makeModel = (id = 'uuid-1'): IScheduleModel => ({
  id,
  professionalId: 'doc-uuid',
  professionalName: 'Dr. Test',
  dayOfWeek: DayOfWeek.MONDAY,
  startTime: '08:00',
  endTime: '12:00',
  slotDurationInMinutes: 30,
  validFrom: null,
  validUntil: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('listSchedulesUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls schedulesService.getAll without params when none provided', async () => {
    ;(schedulesService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })

    await listSchedulesUseCase()

    expect(schedulesService.getAll).toHaveBeenCalledWith(undefined)
  })

  it('passes params to schedulesService.getAll', async () => {
    const params = { professionalId: 'doc-uuid', dayOfWeek: DayOfWeek.FRIDAY }
    ;(schedulesService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })

    await listSchedulesUseCase(params)

    expect(schedulesService.getAll).toHaveBeenCalledWith(params)
  })

  it('maps each dto with toScheduleModel', async () => {
    const dto = makeDto()
    const model = makeModel()
    ;(schedulesService.getAll as jest.Mock).mockResolvedValue({ data: [dto], total: 1, page: 1, limit: 20 })
    ;(toScheduleModel as jest.Mock).mockReturnValue(model)

    const result = await listSchedulesUseCase()

    expect(toScheduleModel).toHaveBeenCalledWith(dto, 0, [dto])
    expect(result.data).toEqual([model])
  })

  it('returns pagination metadata from response', async () => {
    ;(schedulesService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 42, page: 3, limit: 10 })

    const result = await listSchedulesUseCase()

    expect(result.total).toBe(42)
    expect(result.page).toBe(3)
    expect(result.limit).toBe(10)
  })

  it('propagates errors from schedulesService.getAll', async () => {
    ;(schedulesService.getAll as jest.Mock).mockRejectedValue(new Error('Network error'))

    await expect(listSchedulesUseCase()).rejects.toThrow('Network error')
  })
})
