jest.mock('../services/schedule-exceptions.service')

import { listScheduleExceptionsUseCase } from './list-schedule-exceptions.use-case'
import { scheduleExceptionsService } from '../services/schedule-exceptions.service'

const mockService = scheduleExceptionsService as jest.Mocked<typeof scheduleExceptionsService>

const makeDto = (id = 'exc-1') => ({
  id,
  professionalId: 'doc-uuid',
  date: '2099-06-20',
  startTime: '09:00',
  endTime: '12:00',
  reason: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
})

describe('listScheduleExceptionsUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls service with params and returns mapped models', async () => {
    const dto = makeDto()
    mockService.getAll.mockResolvedValue({ data: [dto], total: 1, page: 1, limit: 20 })

    const result = await listScheduleExceptionsUseCase({ professionalId: 'doc-uuid', from: '2099-06-20', to: '2099-06-20' })

    expect(mockService.getAll).toHaveBeenCalledWith({ professionalId: 'doc-uuid', from: '2099-06-20', to: '2099-06-20' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('exc-1')
    expect(result[0].createdAt).toBeInstanceOf(Date)
  })

  it('returns empty array when no exceptions', async () => {
    mockService.getAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })

    const result = await listScheduleExceptionsUseCase()
    expect(result).toHaveLength(0)
  })

  it('calls service without params when none provided', async () => {
    mockService.getAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })

    await listScheduleExceptionsUseCase()
    expect(mockService.getAll).toHaveBeenCalledWith(undefined)
  })
})
