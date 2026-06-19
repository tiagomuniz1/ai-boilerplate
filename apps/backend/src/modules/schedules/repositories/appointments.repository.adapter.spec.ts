import { faker } from '@faker-js/faker'
import { AppointmentsRepositoryAdapter, IAppointmentsRepository } from './appointments.repository.adapter'
import { HasFutureAppointmentsByScheduleUseCase } from '../../appointments/use-cases/has-future-appointments-by-schedule.use-case'

const mockHasFutureUseCase = {
  execute: jest.fn(),
} as unknown as jest.Mocked<HasFutureAppointmentsByScheduleUseCase>

describe('AppointmentsRepositoryAdapter (schedules)', () => {
  let adapter: AppointmentsRepositoryAdapter

  beforeEach(() => {
    jest.clearAllMocks()
    adapter = new AppointmentsRepositoryAdapter(mockHasFutureUseCase)
  })

  it('extends IAppointmentsRepository', () => {
    expect(adapter).toBeInstanceOf(IAppointmentsRepository)
  })

  it('delegates hasFutureAppointmentsByScheduleId to HasFutureAppointmentsByScheduleUseCase and returns true', async () => {
    const scheduleId = faker.string.uuid()
    const clinicId = faker.string.uuid()
    mockHasFutureUseCase.execute.mockResolvedValue(true)

    const result = await adapter.hasFutureAppointmentsByScheduleId(scheduleId, clinicId)

    expect(mockHasFutureUseCase.execute).toHaveBeenCalledWith(scheduleId, clinicId)
    expect(result).toBe(true)
  })

  it('returns false when use case returns false', async () => {
    const scheduleId = faker.string.uuid()
    const clinicId = faker.string.uuid()
    mockHasFutureUseCase.execute.mockResolvedValue(false)

    const result = await adapter.hasFutureAppointmentsByScheduleId(scheduleId, clinicId)

    expect(result).toBe(false)
  })
})
