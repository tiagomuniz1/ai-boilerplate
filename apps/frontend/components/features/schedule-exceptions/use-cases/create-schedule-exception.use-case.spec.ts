jest.mock('../services/schedule-exceptions.service')

import { createScheduleExceptionUseCase } from './create-schedule-exception.use-case'
import { scheduleExceptionsService } from '../services/schedule-exceptions.service'

const mockService = scheduleExceptionsService as jest.Mocked<typeof scheduleExceptionsService>

const makeDto = () => ({
  id: 'exc-uuid',
  professionalId: 'doc-uuid',
  date: '2099-06-20',
  startTime: '14:00',
  endTime: '18:00',
  reason: 'Congresso',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
})

describe('createScheduleExceptionUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls service with mapped input and returns model', async () => {
    const dto = makeDto()
    mockService.create.mockResolvedValue(dto)

    const result = await createScheduleExceptionUseCase({
      professionalId: 'doc-uuid',
      date: '2099-06-20',
      startTime: '14:00',
      endTime: '18:00',
      reason: 'Congresso',
    })

    expect(mockService.create).toHaveBeenCalledWith({
      professionalId: 'doc-uuid',
      date: '2099-06-20',
      startTime: '14:00',
      endTime: '18:00',
      reason: 'Congresso',
    })
    expect(result.id).toBe('exc-uuid')
    expect(result.createdAt).toBeInstanceOf(Date)
  })

  it('sends null for startTime/endTime when not provided', async () => {
    const dto = makeDto()
    mockService.create.mockResolvedValue({ ...dto, startTime: null, endTime: null })

    await createScheduleExceptionUseCase({ date: '2099-06-20' })

    expect(mockService.create).toHaveBeenCalledWith(
      expect.objectContaining({ startTime: null, endTime: null }),
    )
  })

  it('sends null for reason when not provided', async () => {
    const dto = makeDto()
    mockService.create.mockResolvedValue({ ...dto, reason: null })

    await createScheduleExceptionUseCase({ date: '2099-06-20', startTime: '08:00', endTime: '12:00' })

    expect(mockService.create).toHaveBeenCalledWith(
      expect.objectContaining({ reason: null }),
    )
  })

  it('omits professionalId when not provided (DOCTOR role)', async () => {
    mockService.create.mockResolvedValue(makeDto())

    await createScheduleExceptionUseCase({ date: '2099-06-20' })

    const callArg = mockService.create.mock.calls[0][0]
    expect(callArg.professionalId).toBeUndefined()
  })
})
