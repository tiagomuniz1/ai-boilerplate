import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { CacheService } from '../../../cache/cache.service'
import { ISpecialtiesRepository } from '../repositories/specialties.repository.interface'
import { FindAllSpecialtiesUseCase } from '../use-cases/find-all-specialties.use-case'
import { SpecialtyListQueryDto } from '../dto/specialty-list-query.dto'

const mockSpecialtiesRepository: jest.Mocked<ISpecialtiesRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByIds: jest.fn(),
  findByName: jest.fn(),
  countLinkedDoctors: jest.fn(),
  countLinkedClinics: jest.fn(),
  countLinkedClinicsForAll: jest.fn(),
  countLinkedAppointments: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  setIfNotExists: jest.fn(),
  delByPattern: jest.fn(),
} as unknown as jest.Mocked<CacheService>

const makeSpecialty = (overrides = {}) => ({
  id: faker.string.uuid(),
  name: 'Cardiologia',
  description: null,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

describe('FindAllSpecialtiesUseCase', () => {
  let useCase: FindAllSpecialtiesUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindAllSpecialtiesUseCase(
      {} as DataSource,
      mockSpecialtiesRepository,
      mockCacheService,
    )
    mockCacheService.get.mockResolvedValue(null)
    mockCacheService.set.mockResolvedValue(undefined)
    mockSpecialtiesRepository.countLinkedClinicsForAll.mockResolvedValue({})
  })

  it('returns paginated response with correct shape', async () => {
    const specialty = makeSpecialty()
    mockSpecialtiesRepository.findAll.mockResolvedValue([[specialty as any], 1])

    const result = await useCase.execute({ page: 1, limit: 20 } as SpecialtyListQueryDto)

    expect(result.data).toHaveLength(1)
    expect(result.total).toBe(1)
    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
    expect(result.data[0]).not.toHaveProperty('version')
    expect(result.data[0]).not.toHaveProperty('deletedAt')
    expect(result.data[0].clinicCount).toBe(0)
  })

  it('includes clinicCount from countLinkedClinicsForAll', async () => {
    const specialty = makeSpecialty({ id: 'spec-uuid' })
    mockSpecialtiesRepository.findAll.mockResolvedValue([[specialty as any], 1])
    mockSpecialtiesRepository.countLinkedClinicsForAll.mockResolvedValue({ 'spec-uuid': 3 })

    const result = await useCase.execute({ page: 1, limit: 20 } as SpecialtyListQueryDto)

    expect(mockSpecialtiesRepository.countLinkedClinicsForAll).toHaveBeenCalledWith(['spec-uuid'])
    expect(result.data[0].clinicCount).toBe(3)
  })

  it('uses 0 as clinicCount when specialty has no linked clinics', async () => {
    const specialty = makeSpecialty({ id: 'spec-uuid' })
    mockSpecialtiesRepository.findAll.mockResolvedValue([[specialty as any], 1])
    mockSpecialtiesRepository.countLinkedClinicsForAll.mockResolvedValue({})

    const result = await useCase.execute({ page: 1, limit: 20 } as SpecialtyListQueryDto)

    expect(result.data[0].clinicCount).toBe(0)
  })

  it('uses cached result on cache hit', async () => {
    const cached = { data: [], total: 0, page: 1, limit: 20 }
    mockCacheService.get.mockResolvedValue(cached)

    const result = await useCase.execute({ page: 1, limit: 20 } as SpecialtyListQueryDto)

    expect(result).toBe(cached)
    expect(mockSpecialtiesRepository.findAll).not.toHaveBeenCalled()
  })

  it('builds correct cache key without search', async () => {
    mockSpecialtiesRepository.findAll.mockResolvedValue([[], 0])

    await useCase.execute({ page: 1, limit: 20 } as SpecialtyListQueryDto)

    expect(mockCacheService.get).toHaveBeenCalledWith('specialties:list:1:20:')
  })

  it('builds correct cache key with search', async () => {
    mockSpecialtiesRepository.findAll.mockResolvedValue([[], 0])

    await useCase.execute({ page: 1, limit: 20, search: 'Cardio' } as SpecialtyListQueryDto)

    expect(mockCacheService.get).toHaveBeenCalledWith('specialties:list:1:20:Cardio')
  })

  it('saves result to cache with TTL 60', async () => {
    mockSpecialtiesRepository.findAll.mockResolvedValue([[], 0])

    await useCase.execute({ page: 1, limit: 20 } as SpecialtyListQueryDto)

    expect(mockCacheService.set).toHaveBeenCalledWith(
      'specialties:list:1:20:',
      expect.any(Object),
      60,
    )
  })

  it('passes search to repository', async () => {
    mockSpecialtiesRepository.findAll.mockResolvedValue([[], 0])

    await useCase.execute({ page: 1, limit: 20, search: 'Cardio' } as SpecialtyListQueryDto)

    expect(mockSpecialtiesRepository.findAll).toHaveBeenCalledWith(1, 20, 'Cardio')
  })

  it('uses default page=1 and limit=20 when not provided', async () => {
    mockSpecialtiesRepository.findAll.mockResolvedValue([[], 0])

    await useCase.execute({} as SpecialtyListQueryDto)

    expect(mockCacheService.get).toHaveBeenCalledWith('specialties:list:1:20:')
    expect(mockSpecialtiesRepository.findAll).toHaveBeenCalledWith(1, 20, undefined)
  })

  it('continues on cache read failure', async () => {
    mockCacheService.get.mockRejectedValue(new Error('Redis error'))
    mockSpecialtiesRepository.findAll.mockResolvedValue([[], 0])

    await expect(useCase.execute({ page: 1, limit: 20 } as SpecialtyListQueryDto)).resolves.toBeDefined()
  })

  it('continues on cache write failure', async () => {
    mockSpecialtiesRepository.findAll.mockResolvedValue([[], 0])
    mockCacheService.set.mockRejectedValue(new Error('Redis error'))

    await expect(useCase.execute({ page: 1, limit: 20 } as SpecialtyListQueryDto)).resolves.toBeDefined()
  })
})
