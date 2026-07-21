jest.mock('../services/appointments.service')
jest.mock('../mappers/to-available-slot-model.mapper')

import { appointmentsService } from '../services/appointments.service'
import { toAvailableSlotModel } from '../mappers/to-available-slot-model.mapper'
import { getAvailabilityUseCase } from './get-availability.use-case'
import type { IAvailableSlotModel } from '../types/appointment-model.types'

const makeSlotDto = (startTime = '08:00') => ({
  startTime,
  endTime: '08:30',
  scheduleId: 'sched-uuid',
  slotDurationInMinutes: 30,
})

const makeSlotModel = (startTime = '08:00'): IAvailableSlotModel => ({
  startTime,
  endTime: '08:30',
  scheduleId: 'sched-uuid',
  slotDurationInMinutes: 30,
})

describe('getAvailabilityUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls appointmentsService.getAvailability with params', async () => {
    ;(appointmentsService.getAvailability as jest.Mock).mockResolvedValue({ professionalId: 'doc-uuid', date: '2025-06-20', slots: [] })
    await getAvailabilityUseCase({ date: '2025-06-20' })
    expect(appointmentsService.getAvailability).toHaveBeenCalledWith({ date: '2025-06-20' })
  })

  it('maps each slot with toAvailableSlotModel', async () => {
    const dto = makeSlotDto()
    const model = makeSlotModel()
    ;(appointmentsService.getAvailability as jest.Mock).mockResolvedValue({
      professionalId: 'doc-uuid',
      date: '2025-06-20',
      slots: [dto],
    })
    ;(toAvailableSlotModel as jest.Mock).mockReturnValue(model)

    const result = await getAvailabilityUseCase({ professionalId: 'doc-uuid', date: '2025-06-20' })

    expect(toAvailableSlotModel).toHaveBeenCalledWith(dto, 0, [dto])
    expect(result).toEqual([model])
  })

  it('returns empty array when no slots', async () => {
    ;(appointmentsService.getAvailability as jest.Mock).mockResolvedValue({ professionalId: 'doc-uuid', date: '2025-06-20', slots: [] })
    const result = await getAvailabilityUseCase({ date: '2025-06-20' })
    expect(result).toEqual([])
  })

  it('propagates errors from service', async () => {
    ;(appointmentsService.getAvailability as jest.Mock).mockRejectedValue(new Error('Network error'))
    await expect(getAvailabilityUseCase({ date: '2025-06-20' })).rejects.toThrow('Network error')
  })
})
