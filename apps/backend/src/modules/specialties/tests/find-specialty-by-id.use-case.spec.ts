import { NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { CacheService } from '../../../cache/cache.service'
import { ISpecialtiesRepository } from '../repositories/specialties.repository.interface'
import { FindSpecialtyByIdUseCase } from '../use-cases/find-specialty-by-id.use-case'

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

describe('FindSpecialtyByIdUseCase', () => {
  let useCase: FindSpecialtyByIdUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindSpecialtyByIdUseCase(
      {} as DataSource,
      mockSpecialtiesRepository,
      mockCacheService,
    )
    mockCacheService.get.mockResolvedValue(null)
    mockCacheService.set.mockResolvedValue(undefined)
    mockSpecialtiesRepository.countLinkedClinics.mockResolvedValue(0)
  })

  it('returns SpecialtyResponseDto when found', async () => {
    const specialty = makeSpecialty()
    mockSpecialtiesRepository.findById.mockResolvedValue(specialty as any)

    const result = await useCase.execute(specialty.id)

    expect(result.id).toBe(specialty.id)
    expect(result.name).toBe(specialty.name)
    expect(result.description).toBeNull()
    expect(result.clinicCount).toBe(0)
    expect(result.createdAt).toBe(specialty.createdAt)
    expect(result.updatedAt).toBe(specialty.updatedAt)
  })

  it('response does not contain version or deletedAt', async () => {
    const specialty = makeSpecialty()
    mockSpecialtiesRepository.findById.mockResolvedValue(specialty as any)

    const result = await useCase.execute(specialty.id)

    expect(result).not.toHaveProperty('version')
    expect(result).not.toHaveProperty('deletedAt')
  })

  it('throws NotFoundException when specialty does not exist', async () => {
    mockSpecialtiesRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(faker.string.uuid())).rejects.toThrow(NotFoundException)
  })

  it('returns cached result on cache hit', async () => {
    const cached = { id: 'uuid-1', name: 'Cardiologia', description: null, createdAt: new Date(), updatedAt: new Date() }
    mockCacheService.get.mockResolvedValue(cached)

    const result = await useCase.execute('uuid-1')

    expect(result).toBe(cached)
    expect(mockSpecialtiesRepository.findById).not.toHaveBeenCalled()
  })

  it('saves to cache with TTL 300', async () => {
    const specialty = makeSpecialty()
    mockSpecialtiesRepository.findById.mockResolvedValue(specialty as any)

    await useCase.execute(specialty.id)

    expect(mockCacheService.set).toHaveBeenCalledWith(
      `specialty:${specialty.id}`,
      expect.any(Object),
      300,
    )
  })

  it('uses correct cache key', async () => {
    const id = faker.string.uuid()
    mockSpecialtiesRepository.findById.mockResolvedValue(makeSpecialty({ id }) as any)

    await useCase.execute(id)

    expect(mockCacheService.get).toHaveBeenCalledWith(`specialty:${id}`)
  })

  it('continues on cache read failure', async () => {
    const specialty = makeSpecialty()
    mockCacheService.get.mockRejectedValue(new Error('Redis error'))
    mockSpecialtiesRepository.findById.mockResolvedValue(specialty as any)

    await expect(useCase.execute(specialty.id)).resolves.toBeDefined()
  })

  it('continues on cache write failure', async () => {
    const specialty = makeSpecialty()
    mockSpecialtiesRepository.findById.mockResolvedValue(specialty as any)
    mockCacheService.set.mockRejectedValue(new Error('Redis error'))

    await expect(useCase.execute(specialty.id)).resolves.toBeDefined()
  })
})
