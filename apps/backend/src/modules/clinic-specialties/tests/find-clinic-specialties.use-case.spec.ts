import { ForbiddenException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { FindClinicByIdUseCase } from '../../clinics/use-cases/find-clinic-by-id.use-case'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IClinicSpecialtiesRepository } from '../repositories/clinic-specialties.repository.interface'
import { FindClinicSpecialtiesUseCase } from '../use-cases/find-clinic-specialties.use-case'

const mockClinicSpecialtiesRepository: jest.Mocked<IClinicSpecialtiesRepository> = {
  findByClinicId: jest.fn(),
  findByClinicAndSpecialty: jest.fn(),
  link: jest.fn(),
  unlink: jest.fn(),
}

const mockFindClinicByIdUseCase = {
  execute: jest.fn(),
} as unknown as jest.Mocked<FindClinicByIdUseCase>

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  setIfNotExists: jest.fn(),
  delByPattern: jest.fn(),
} as unknown as jest.Mocked<CacheService>

const makePlatformAdmin = (): ICurrentUser => ({
  id: faker.string.uuid(),
  role: UserRole.PLATFORM_ADMIN,
  clinicId: null,
})

const makeClinicUser = (clinicId: string, role = UserRole.ADMIN): ICurrentUser => ({
  id: faker.string.uuid(),
  role,
  clinicId,
})

const makeRecord = (clinicId: string, overrides = {}) => ({
  id: faker.string.uuid(),
  clinicId,
  specialtyId: faker.string.uuid(),
  createdAt: new Date(),
  specialty: {
    name: 'Cardiologia',
    description: null,
  },
  ...overrides,
})

describe('FindClinicSpecialtiesUseCase', () => {
  let useCase: FindClinicSpecialtiesUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindClinicSpecialtiesUseCase(
      {} as DataSource,
      mockClinicSpecialtiesRepository,
      mockFindClinicByIdUseCase,
      mockCacheService,
    )
  })

  it('returns paginated clinic specialties for PLATFORM_ADMIN', async () => {
    const clinicId = faker.string.uuid()
    const record = makeRecord(clinicId)

    mockFindClinicByIdUseCase.execute.mockResolvedValue({} as any)
    mockCacheService.get.mockResolvedValue(null)
    mockClinicSpecialtiesRepository.findByClinicId.mockResolvedValue([[record] as any, 1])
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(clinicId, { page: 1, limit: 20 }, makePlatformAdmin())

    expect(result.data).toHaveLength(1)
    expect(result.total).toBe(1)
    expect(result.data[0].clinicId).toBe(clinicId)
    expect(result.data[0].name).toBe('Cardiologia')
    expect(result.data[0].linkedAt).toBe(record.createdAt)
  })

  it('returns paginated clinic specialties for clinic ADMIN accessing own clinic', async () => {
    const clinicId = faker.string.uuid()
    const record = makeRecord(clinicId)

    mockFindClinicByIdUseCase.execute.mockResolvedValue({} as any)
    mockCacheService.get.mockResolvedValue(null)
    mockClinicSpecialtiesRepository.findByClinicId.mockResolvedValue([[record] as any, 1])
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(
      clinicId,
      { page: 1, limit: 20 },
      makeClinicUser(clinicId),
    )

    expect(result.data).toHaveLength(1)
  })

  it('throws ForbiddenException when clinic user accesses different clinic', async () => {
    const clinicId = faker.string.uuid()
    const otherClinicId = faker.string.uuid()

    await expect(
      useCase.execute(otherClinicId, { page: 1, limit: 20 }, makeClinicUser(clinicId)),
    ).rejects.toThrow(ForbiddenException)

    expect(mockClinicSpecialtiesRepository.findByClinicId).not.toHaveBeenCalled()
  })

  it('returns cached result when available', async () => {
    const clinicId = faker.string.uuid()
    const cached = { data: [], total: 0, page: 1, limit: 20 }

    mockFindClinicByIdUseCase.execute.mockResolvedValue({} as any)
    mockCacheService.get.mockResolvedValue(cached)

    const result = await useCase.execute(clinicId, { page: 1, limit: 20 }, makePlatformAdmin())

    expect(result).toBe(cached)
    expect(mockClinicSpecialtiesRepository.findByClinicId).not.toHaveBeenCalled()
  })

  it('continues when cache read fails', async () => {
    const clinicId = faker.string.uuid()
    const record = makeRecord(clinicId)

    mockFindClinicByIdUseCase.execute.mockResolvedValue({} as any)
    mockCacheService.get.mockRejectedValue(new Error('Redis error'))
    mockClinicSpecialtiesRepository.findByClinicId.mockResolvedValue([[record] as any, 1])
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(clinicId, { page: 1, limit: 20 }, makePlatformAdmin())

    expect(result.data).toHaveLength(1)
  })

  it('paginates results correctly', async () => {
    const clinicId = faker.string.uuid()

    mockFindClinicByIdUseCase.execute.mockResolvedValue({} as any)
    mockCacheService.get.mockResolvedValue(null)
    mockClinicSpecialtiesRepository.findByClinicId.mockResolvedValue([[], 0])
    mockCacheService.set.mockResolvedValue(undefined)

    const result = await useCase.execute(
      clinicId,
      { page: 2, limit: 10 },
      makePlatformAdmin(),
    )

    expect(result.page).toBe(2)
    expect(result.limit).toBe(10)
    expect(mockClinicSpecialtiesRepository.findByClinicId).toHaveBeenCalledWith(
      clinicId,
      2,
      10,
      undefined,
    )
  })
})
