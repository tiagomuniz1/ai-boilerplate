import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { IAppointmentsRepository } from '../repositories/appointments.repository.interface'
import { HasFutureAppointmentsByScheduleUseCase } from '../use-cases/has-future-appointments-by-schedule.use-case'

const mockAppointmentsRepository: jest.Mocked<IAppointmentsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findActiveByProfessionalAndDate: jest.fn(),
  findActiveBySlot: jest.fn(),
  hasFutureByScheduleId: jest.fn(),
  hasFutureByProfessionalId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
}

describe('HasFutureAppointmentsByScheduleUseCase', () => {
  let useCase: HasFutureAppointmentsByScheduleUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new HasFutureAppointmentsByScheduleUseCase(
      {} as DataSource,
      mockAppointmentsRepository,
    )
  })

  it('returns true when future appointments exist', async () => {
    mockAppointmentsRepository.hasFutureByScheduleId.mockResolvedValue(true)
    const result = await useCase.execute(faker.string.uuid(), faker.string.uuid())
    expect(result).toBe(true)
  })

  it('returns false when no future appointments', async () => {
    mockAppointmentsRepository.hasFutureByScheduleId.mockResolvedValue(false)
    const result = await useCase.execute(faker.string.uuid(), faker.string.uuid())
    expect(result).toBe(false)
  })

  it('delegates to repository with correct args', async () => {
    const scheduleId = faker.string.uuid()
    const clinicId = faker.string.uuid()
    mockAppointmentsRepository.hasFutureByScheduleId.mockResolvedValue(false)

    await useCase.execute(scheduleId, clinicId)

    expect(mockAppointmentsRepository.hasFutureByScheduleId).toHaveBeenCalledWith(scheduleId, clinicId)
  })
})
