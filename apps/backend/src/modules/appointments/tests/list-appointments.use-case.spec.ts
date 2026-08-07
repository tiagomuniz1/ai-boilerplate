import { NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { AppointmentStatus, UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IAppointmentsRepository } from '../repositories/appointments.repository.interface'
import { ListAppointmentsUseCase } from '../use-cases/list-appointments.use-case'

const CLINIC_ID = 'clinic-uuid'
const doctorUserId = faker.string.uuid()
const professionalId = faker.string.uuid()

const doctorUser: ICurrentUser = { id: doctorUserId, role: UserRole.PROFESSIONAL, clinicId: CLINIC_ID }
const adminUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }
const userUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.USER, clinicId: CLINIC_ID }

const makeAppointment = (overrides = {}) => ({
  id: faker.string.uuid(),
  clinicId: CLINIC_ID,
  professionalId,
  patientId: faker.string.uuid(),
  specialtyId: null,
  scheduleId: faker.string.uuid(),
  date: '2025-06-20',
  startTime: '08:00',
  endTime: '08:30',
  status: AppointmentStatus.SCHEDULED,
  reason: null,
  cancellationReason: null,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

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

const mockProfessionalsRepository: jest.Mocked<IProfessionalsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByRegistration: jest.fn(),
  countByClinic: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  delByPrefix: jest.fn(),
} as unknown as jest.Mocked<CacheService>

function makeMockDataSource(): DataSource {
  const builder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([{ professionalId, fullName: 'Dr. Test' }]),
  }
  return { createQueryBuilder: jest.fn().mockReturnValue(builder) } as unknown as DataSource
}

describe('ListAppointmentsUseCase', () => {
  let useCase: ListAppointmentsUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new ListAppointmentsUseCase(
      makeMockDataSource(),
      mockAppointmentsRepository,
      mockProfessionalsRepository,
      mockCacheService,
    )
    mockCacheService.get.mockResolvedValue(null)
    mockCacheService.set.mockResolvedValue(undefined)
    mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: professionalId } as any)
    mockAppointmentsRepository.findAll.mockResolvedValue([[], 0])
  })

  it('DOCTOR: forces professionalId to own profile and ignores query professionalId', async () => {
    await useCase.execute({ professionalId: faker.string.uuid(), page: 1, limit: 20 }, doctorUser)

    const callArgs = mockAppointmentsRepository.findAll.mock.calls[0]
    expect(callArgs[0].professionalId).toBe(professionalId)
  })

  it('DOCTOR: throws NotFoundException when no doctor profile', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue(null)
    await expect(useCase.execute({ page: 1, limit: 20 }, doctorUser)).rejects.toThrow(NotFoundException)
  })

  it('ADMIN: uses provided professionalId filter', async () => {
    const filterId = faker.string.uuid()
    await useCase.execute({ professionalId: filterId, page: 1, limit: 20 }, adminUser)

    const callArgs = mockAppointmentsRepository.findAll.mock.calls[0]
    expect(callArgs[0].professionalId).toBe(filterId)
  })

  it('ADMIN: returns all appointments when no professionalId provided', async () => {
    await useCase.execute({ page: 1, limit: 20 }, adminUser)

    const callArgs = mockAppointmentsRepository.findAll.mock.calls[0]
    expect(callArgs[0].professionalId).toBeUndefined()
  })

  it('USER: can list appointments (read-only)', async () => {
    await expect(useCase.execute({ page: 1, limit: 20 }, userUser)).resolves.toBeDefined()
  })

  it('uses cache on second identical request', async () => {
    const cachedResult = { data: [], total: 0, page: 1, limit: 20 }
    mockCacheService.get.mockResolvedValue(cachedResult)

    const result = await useCase.execute({ page: 1, limit: 20 }, adminUser)
    expect(result).toEqual(cachedResult)
    expect(mockAppointmentsRepository.findAll).not.toHaveBeenCalled()
  })

  it('returns paginated data with resolved names', async () => {
    const apt = makeAppointment()
    mockAppointmentsRepository.findAll.mockResolvedValue([[apt as any], 1])

    const result = await useCase.execute({ page: 1, limit: 20 }, adminUser)
    expect(result.total).toBe(1)
    expect(result.data).toHaveLength(1)
  })

  it('resolves specialty names only for appointments that have a specialty', async () => {
    const builder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([{ specialtyId: 'spec-x', name: 'Cardiologia' }]),
    }
    const ds = { createQueryBuilder: jest.fn().mockReturnValue(builder) } as unknown as DataSource
    const useCaseWithSpecialty = new ListAppointmentsUseCase(
      ds,
      mockAppointmentsRepository,
      mockProfessionalsRepository,
      mockCacheService,
    )

    const withSpecialty = makeAppointment({ specialtyId: 'spec-x' })
    const unmappedSpecialty = makeAppointment({ specialtyId: 'spec-y' })
    const withoutSpecialty = makeAppointment({ specialtyId: null })
    mockAppointmentsRepository.findAll.mockResolvedValue([
      [withSpecialty as any, unmappedSpecialty as any, withoutSpecialty as any],
      3,
    ])

    const result = await useCaseWithSpecialty.execute({ page: 1, limit: 20 }, adminUser)

    expect(result.data[0].specialtyName).toBe('Cardiologia')
    expect(result.data[1].specialtyName).toBeNull()
    expect(result.data[2].specialtyName).toBeNull()
  })

  it('continues when cache read fails', async () => {
    mockCacheService.get.mockRejectedValue(new Error('Redis error'))
    await expect(useCase.execute({ page: 1, limit: 20 }, adminUser)).resolves.toBeDefined()
  })

  it('continues when cache write fails', async () => {
    mockCacheService.set.mockRejectedValue(new Error('Redis error'))
    await expect(useCase.execute({ page: 1, limit: 20 }, adminUser)).resolves.toBeDefined()
  })

  it('uses default page=1 and limit=20 when not provided in query', async () => {
    const result = await useCase.execute({} as any, adminUser)

    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
  })

  it('returns empty string for professionalName when doctor is not in name map', async () => {
    const unknownDoctorId = faker.string.uuid()
    const appointment = makeAppointment({ professionalId: unknownDoctorId })
    mockAppointmentsRepository.findAll.mockResolvedValue([[appointment as any], 1])

    const result = await useCase.execute({ page: 1, limit: 20 }, adminUser)

    expect(result.data[0].professionalName).toBe('')
  })
})
