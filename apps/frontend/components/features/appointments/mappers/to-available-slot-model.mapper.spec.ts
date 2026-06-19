import { toAvailableSlotModel } from './to-available-slot-model.mapper'

const makeDto = (overrides = {}) => ({
  startTime: '08:00',
  endTime: '08:30',
  scheduleId: 'sched-uuid',
  slotDurationInMinutes: 30,
  ...overrides,
})

describe('toAvailableSlotModel', () => {
  it('maps all fields 1:1', () => {
    const dto = makeDto()
    const model = toAvailableSlotModel(dto)

    expect(model.startTime).toBe('08:00')
    expect(model.endTime).toBe('08:30')
    expect(model.scheduleId).toBe('sched-uuid')
    expect(model.slotDurationInMinutes).toBe(30)
  })

  it('maps 60 min slot duration correctly', () => {
    const model = toAvailableSlotModel(makeDto({ slotDurationInMinutes: 60, endTime: '09:00' }))
    expect(model.slotDurationInMinutes).toBe(60)
    expect(model.endTime).toBe('09:00')
  })
})
