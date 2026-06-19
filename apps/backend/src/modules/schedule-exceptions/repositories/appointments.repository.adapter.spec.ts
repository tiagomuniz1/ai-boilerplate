import { faker } from '@faker-js/faker'
import { AppointmentsRepositoryAdapter, IAppointmentsRepository } from './appointments.repository.adapter'
import { FindScheduledAppointmentsInWindowUseCase } from '../../appointments/use-cases/find-scheduled-appointments-in-window.use-case'

const mockFindInWindowUseCase = {
  execute: jest.fn(),
} as unknown as jest.Mocked<FindScheduledAppointmentsInWindowUseCase>

describe('AppointmentsRepositoryAdapter (schedule-exceptions)', () => {
  let adapter: AppointmentsRepositoryAdapter

  beforeEach(() => {
    jest.clearAllMocks()
    adapter = new AppointmentsRepositoryAdapter(mockFindInWindowUseCase)
  })

  it('extends IAppointmentsRepository', () => {
    expect(adapter).toBeInstanceOf(IAppointmentsRepository)
  })

  it('delegates findScheduledAppointmentsInWindow to FindScheduledAppointmentsInWindowUseCase', async () => {
    const doctorId = faker.string.uuid()
    const clinicId = faker.string.uuid()
    const conflicts = [
      { id: faker.string.uuid(), startTime: '08:00', endTime: '08:30', patientName: 'Patient A' },
    ]
    mockFindInWindowUseCase.execute.mockResolvedValue(conflicts)

    const result = await adapter.findScheduledAppointmentsInWindow(
      doctorId,
      '2099-06-20',
      '08:00',
      '12:00',
      clinicId,
    )

    expect(mockFindInWindowUseCase.execute).toHaveBeenCalledWith(
      doctorId,
      '2099-06-20',
      '08:00',
      '12:00',
      clinicId,
    )
    expect(result).toBe(conflicts)
  })

  it('passes null startTime and endTime (full-day block)', async () => {
    const doctorId = faker.string.uuid()
    const clinicId = faker.string.uuid()
    mockFindInWindowUseCase.execute.mockResolvedValue([])

    const result = await adapter.findScheduledAppointmentsInWindow(
      doctorId,
      '2099-06-20',
      null,
      null,
      clinicId,
    )

    expect(mockFindInWindowUseCase.execute).toHaveBeenCalledWith(doctorId, '2099-06-20', null, null, clinicId)
    expect(result).toEqual([])
  })
})
