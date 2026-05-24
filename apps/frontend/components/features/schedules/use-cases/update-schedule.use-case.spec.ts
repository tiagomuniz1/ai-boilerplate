jest.mock('../services/schedules.service')
jest.mock('../mappers/to-update-schedule-dto.mapper')
jest.mock('../mappers/to-schedule-model.mapper')

import { DayOfWeek } from '@app/shared'
import { schedulesService } from '../services/schedules.service'
import { toUpdateScheduleDto } from '../mappers/to-update-schedule-dto.mapper'
import { toScheduleModel } from '../mappers/to-schedule-model.mapper'
import { updateScheduleUseCase } from './update-schedule.use-case'
import type { IUpdateScheduleInput } from '../types/schedule-input.types'
import type { IScheduleModel } from '../types/schedule-model.types'

const input: IUpdateScheduleInput = { startTime: '10:00' }
const mockDto = { startTime: '10:00' }
const mockResponse = {
  id: 'uuid-1',
  doctorId: 'doc-uuid',
  dayOfWeek: DayOfWeek.MONDAY,
  startTime: '10:00',
  endTime: '12:00',
  slotDurationInMinutes: 30,
  validFrom: null,
  validUntil: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}
const mockModel: IScheduleModel = { ...mockResponse, createdAt: new Date(), updatedAt: new Date() }

describe('updateScheduleUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls toUpdateScheduleDto with input', async () => {
    ;(toUpdateScheduleDto as jest.Mock).mockReturnValue(mockDto)
    ;(schedulesService.update as jest.Mock).mockResolvedValue(mockResponse)
    ;(toScheduleModel as jest.Mock).mockReturnValue(mockModel)

    await updateScheduleUseCase('uuid-1', input)

    expect(toUpdateScheduleDto).toHaveBeenCalledWith(input)
  })

  it('calls schedulesService.update with id and mapped dto', async () => {
    ;(toUpdateScheduleDto as jest.Mock).mockReturnValue(mockDto)
    ;(schedulesService.update as jest.Mock).mockResolvedValue(mockResponse)
    ;(toScheduleModel as jest.Mock).mockReturnValue(mockModel)

    await updateScheduleUseCase('uuid-1', input)

    expect(schedulesService.update).toHaveBeenCalledWith('uuid-1', mockDto)
  })

  it('returns the model mapped from the response', async () => {
    ;(toUpdateScheduleDto as jest.Mock).mockReturnValue(mockDto)
    ;(schedulesService.update as jest.Mock).mockResolvedValue(mockResponse)
    ;(toScheduleModel as jest.Mock).mockReturnValue(mockModel)

    const result = await updateScheduleUseCase('uuid-1', input)

    expect(toScheduleModel).toHaveBeenCalledWith(mockResponse)
    expect(result).toBe(mockModel)
  })

  it('propagates errors from schedulesService.update', async () => {
    ;(toUpdateScheduleDto as jest.Mock).mockReturnValue(mockDto)
    ;(schedulesService.update as jest.Mock).mockRejectedValue({ status: 409 })

    await expect(updateScheduleUseCase('uuid-1', input)).rejects.toEqual({ status: 409 })
  })
})
