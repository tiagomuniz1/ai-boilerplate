import { ConflictException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { CacheService } from '../../../cache/cache.service'
import { ISpecialtiesRepository } from '../repositories/specialties.repository.interface'
import { CreateSpecialtyUseCase } from '../use-cases/create-specialty.use-case'

const mockSpecialtiesRepository: jest.Mocked<ISpecialtiesRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByIds: jest.fn(),
  findByName: jest.fn(),
  countLinkedDoctors: jest.fn(),
  countLinkedClinics: jest.fn(),
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

describe('CreateSpecialtyUseCase', () => {
  let useCase: CreateSpecialtyUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new CreateSpecialtyUseCase(
      {} as DataSource,
      mockSpecialtiesRepository,
      mockCacheService,
    )
  })

  it('creates specialty and returns response', async () => {
    const dto = { name: 'Cardiologia' }
    const created = makeSpecialty()

    mockSpecialtiesRepository.findByName.mockResolvedValue(null)
    mockSpecialtiesRepository.create.mockResolvedValue(created as any)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(dto)

    expect(result.id).toBe(created.id)
    expect(result.name).toBe(created.name)
    expect(result.description).toBeNull()
    expect(result.createdAt).toBe(created.createdAt)
    expect(result.updatedAt).toBe(created.updatedAt)
  })

  it('response does not contain version or deletedAt', async () => {
    const dto = { name: 'Cardiologia' }
    const created = makeSpecialty()

    mockSpecialtiesRepository.findByName.mockResolvedValue(null)
    mockSpecialtiesRepository.create.mockResolvedValue(created as any)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(dto)

    expect(result).not.toHaveProperty('version')
    expect(result).not.toHaveProperty('deletedAt')
  })

  it('creates specialty with description', async () => {
    const dto = { name: 'Neurologia', description: 'Especialidade do sistema nervoso' }
    const created = makeSpecialty({ name: 'Neurologia', description: 'Especialidade do sistema nervoso' })

    mockSpecialtiesRepository.findByName.mockResolvedValue(null)
    mockSpecialtiesRepository.create.mockResolvedValue(created as any)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(dto)

    expect(result.description).toBe('Especialidade do sistema nervoso')
  })

  it('throws ConflictException when name already in use by active specialty', async () => {
    mockSpecialtiesRepository.findByName.mockResolvedValue(makeSpecialty() as any)

    await expect(useCase.execute({ name: 'Cardiologia' })).rejects.toThrow(ConflictException)
    expect(mockSpecialtiesRepository.create).not.toHaveBeenCalled()
  })

  it('invalidates list cache after creation', async () => {
    mockSpecialtiesRepository.findByName.mockResolvedValue(null)
    mockSpecialtiesRepository.create.mockResolvedValue(makeSpecialty() as any)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute({ name: 'Cardiologia' })

    expect(mockCacheService.delByPattern).toHaveBeenCalledWith('specialties:list*')
  })

  it('continues when cache invalidation fails', async () => {
    mockSpecialtiesRepository.findByName.mockResolvedValue(null)
    mockSpecialtiesRepository.create.mockResolvedValue(makeSpecialty() as any)
    mockCacheService.delByPattern.mockRejectedValue(new Error('Redis error'))

    const result = await useCase.execute({ name: 'Cardiologia' })

    expect(result.id).toBeDefined()
  })
})
