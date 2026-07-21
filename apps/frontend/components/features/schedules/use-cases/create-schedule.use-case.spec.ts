jest.mock('../services/schedules.service')
jest.mock('../mappers/to-create-schedule-dto.mapper')
jest.mock('../mappers/to-schedule-model.mapper')

import { DayOfWeek } from '@app/shared'
import { schedulesService } from '../services/schedules.service'
import { toCreateScheduleDto } from '../mappers/to-create-schedule-dto.mapper'
import { toScheduleModel } from '../mappers/to-schedule-model.mapper'
import { createScheduleUseCase } from './create-schedule.use-case'
import type { ICreateScheduleInput } from '../types/schedule-input.types'
import type { IScheduleModel } from '../types/schedule-model.types'

const input: ICreateScheduleInput = {
  dayOfWeek: DayOfWeek.TUESDAY,
  startTime: '09:00',
  endTime: '13:00',
  slotDurationInMinutes: 60,
}

const mockDto = { dayOfWeek: DayOfWeek.TUESDAY, startTime: '09:00', endTime: '13:00', slotDurationInMinutes: 60 }
const mockResponse = { id: 'uuid-1', ...mockDto, professionalId: 'doc-uuid', validFrom: null, validUntil: null, createdAt: new Date(), updatedAt: new Date() }
const mockModel: IScheduleModel = { ...mockResponse, createdAt: new Date(), updatedAt: new Date() }

describe('createScheduleUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls toCreateScheduleDto with input', async () => {
    ;(toCreateScheduleDto as jest.Mock).mockReturnValue(mockDto)
    ;(schedulesService.create as jest.Mock).mockResolvedValue(mockResponse)
    ;(toScheduleModel as jest.Mock).mockReturnValue(mockModel)

    await createScheduleUseCase(input)

    expect(toCreateScheduleDto).toHaveBeenCalledWith(input)
  })

  it('calls schedulesService.create with mapped dto', async () => {
    ;(toCreateScheduleDto as jest.Mock).mockReturnValue(mockDto)
    ;(schedulesService.create as jest.Mock).mockResolvedValue(mockResponse)
    ;(toScheduleModel as jest.Mock).mockReturnValue(mockModel)

    await createScheduleUseCase(input)

    expect(schedulesService.create).toHaveBeenCalledWith(mockDto)
  })

  it('returns the model mapped from the response', async () => {
    ;(toCreateScheduleDto as jest.Mock).mockReturnValue(mockDto)
    ;(schedulesService.create as jest.Mock).mockResolvedValue(mockResponse)
    ;(toScheduleModel as jest.Mock).mockReturnValue(mockModel)

    const result = await createScheduleUseCase(input)

    expect(toScheduleModel).toHaveBeenCalledWith(mockResponse)
    expect(result).toBe(mockModel)
  })

  it('propagates errors from schedulesService.create', async () => {
    ;(toCreateScheduleDto as jest.Mock).mockReturnValue(mockDto)
    ;(schedulesService.create as jest.Mock).mockRejectedValue({ status: 409 })

    await expect(createScheduleUseCase(input)).rejects.toEqual({ status: 409 })
  })
})
