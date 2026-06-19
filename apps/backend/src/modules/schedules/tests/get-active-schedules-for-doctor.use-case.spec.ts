import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { DayOfWeek } from '@app/shared'
import { ISchedulesRepository } from '../repositories/schedules.repository.interface'
import { GetActiveSchedulesForDoctorUseCase } from '../use-cases/get-active-schedules-for-doctor.use-case'

const mockSchedulesRepository: jest.Mocked<ISchedulesRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findOverlapping: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  deleteAllByDoctorId: jest.fn(),
  findActiveByDoctorAndDate: jest.fn(),
}

describe('GetActiveSchedulesForDoctorUseCase', () => {
  let useCase: GetActiveSchedulesForDoctorUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new GetActiveSchedulesForDoctorUseCase({} as DataSource, mockSchedulesRepository)
    mockSchedulesRepository.findActiveByDoctorAndDate.mockResolvedValue([])
  })

  it('maps Sunday date (UTC) to DayOfWeek.SUNDAY', async () => {
    await useCase.execute(faker.string.uuid(), faker.string.uuid(), '2025-06-15') // 2025-06-15 is a Sunday
    const call = mockSchedulesRepository.findActiveByDoctorAndDate.mock.calls[0]
    expect(call[1]).toBe(DayOfWeek.SUNDAY)
  })

  it('maps Monday date (UTC) to DayOfWeek.MONDAY', async () => {
    await useCase.execute(faker.string.uuid(), faker.string.uuid(), '2025-06-16') // Monday
    const call = mockSchedulesRepository.findActiveByDoctorAndDate.mock.calls[0]
    expect(call[1]).toBe(DayOfWeek.MONDAY)
  })

  it('maps Wednesday date (UTC) to DayOfWeek.WEDNESDAY', async () => {
    await useCase.execute(faker.string.uuid(), faker.string.uuid(), '2025-06-18') // Wednesday
    const call = mockSchedulesRepository.findActiveByDoctorAndDate.mock.calls[0]
    expect(call[1]).toBe(DayOfWeek.WEDNESDAY)
  })

  it('maps Friday date (UTC) to DayOfWeek.FRIDAY', async () => {
    await useCase.execute(faker.string.uuid(), faker.string.uuid(), '2025-06-20') // Friday
    const call = mockSchedulesRepository.findActiveByDoctorAndDate.mock.calls[0]
    expect(call[1]).toBe(DayOfWeek.FRIDAY)
  })

  it('passes doctorId, date, and clinicId to repository', async () => {
    const doctorId = faker.string.uuid()
    const clinicId = faker.string.uuid()
    const date = '2025-06-20'

    await useCase.execute(doctorId, clinicId, date)

    const call = mockSchedulesRepository.findActiveByDoctorAndDate.mock.calls[0]
    expect(call[0]).toBe(doctorId)
    expect(call[2]).toBe(date)
    expect(call[3]).toBe(clinicId)
  })

  it('returns schedules from repository', async () => {
    const schedules = [{ id: faker.string.uuid() }] as any
    mockSchedulesRepository.findActiveByDoctorAndDate.mockResolvedValue(schedules)

    const result = await useCase.execute(faker.string.uuid(), faker.string.uuid(), '2025-06-20')
    expect(result).toBe(schedules)
  })

  it('returns empty array when no active schedules', async () => {
    mockSchedulesRepository.findActiveByDoctorAndDate.mockResolvedValue([])
    const result = await useCase.execute(faker.string.uuid(), faker.string.uuid(), '2025-06-20')
    expect(result).toHaveLength(0)
  })
})
