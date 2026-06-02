import { ConflictException, NotFoundException } from '@nestjs/common'
import { DataSource, OptimisticLockVersionMismatchError } from 'typeorm'
import { faker } from '@faker-js/faker'
import { CacheService } from '../../../cache/cache.service'
import { ISpecialtiesRepository } from '../repositories/specialties.repository.interface'
import { UpdateSpecialtyUseCase } from '../use-cases/update-specialty.use-case'

const mockSpecialtiesRepository: jest.Mocked<ISpecialtiesRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByIds: jest.fn(),
  findByName: jest.fn(),
  countLinkedDoctors: jest.fn(),
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

describe('UpdateSpecialtyUseCase', () => {
  let useCase: UpdateSpecialtyUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new UpdateSpecialtyUseCase(
      {} as DataSource,
      mockSpecialtiesRepository,
      mockCacheService,
    )
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)
  })

  it('updates specialty and returns response', async () => {
    const specialty = makeSpecialty()
    const updated = makeSpecialty({ id: specialty.id, name: 'Neurologia' })

    mockSpecialtiesRepository.findById.mockResolvedValue(specialty as any)
    mockSpecialtiesRepository.findByName.mockResolvedValue(null)
    mockSpecialtiesRepository.update.mockResolvedValue(updated as any)

    const result = await useCase.execute(specialty.id, { name: 'Neurologia' })

    expect(result.id).toBe(specialty.id)
    expect(result.name).toBe('Neurologia')
  })

  it('response does not contain version or deletedAt', async () => {
    const specialty = makeSpecialty()
    const updated = makeSpecialty({ id: specialty.id })

    mockSpecialtiesRepository.findById.mockResolvedValue(specialty as any)
    mockSpecialtiesRepository.update.mockResolvedValue(updated as any)

    const result = await useCase.execute(specialty.id, { description: 'Updated description' })

    expect(result).not.toHaveProperty('version')
    expect(result).not.toHaveProperty('deletedAt')
  })

  it('throws NotFoundException when specialty does not exist', async () => {
    mockSpecialtiesRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(faker.string.uuid(), { name: 'Neurologia' })).rejects.toThrow(NotFoundException)
    expect(mockSpecialtiesRepository.update).not.toHaveBeenCalled()
  })

  it('throws ConflictException when new name is already in use by another specialty', async () => {
    const specialty = makeSpecialty({ name: 'Cardiologia' })
    const other = makeSpecialty({ name: 'Neurologia' })

    mockSpecialtiesRepository.findById.mockResolvedValue(specialty as any)
    mockSpecialtiesRepository.findByName.mockResolvedValue(other as any)

    await expect(useCase.execute(specialty.id, { name: 'Neurologia' })).rejects.toThrow(ConflictException)
    expect(mockSpecialtiesRepository.update).not.toHaveBeenCalled()
  })

  it('does not check uniqueness when name is unchanged (same value)', async () => {
    const specialty = makeSpecialty({ name: 'Cardiologia' })
    const updated = makeSpecialty({ id: specialty.id, name: 'Cardiologia' })

    mockSpecialtiesRepository.findById.mockResolvedValue(specialty as any)
    mockSpecialtiesRepository.update.mockResolvedValue(updated as any)

    const result = await useCase.execute(specialty.id, { name: 'cardiologia' })

    expect(mockSpecialtiesRepository.findByName).not.toHaveBeenCalled()
    expect(result.name).toBe('Cardiologia')
  })

  it('does not check uniqueness when name is not in dto', async () => {
    const specialty = makeSpecialty()
    const updated = makeSpecialty({ id: specialty.id, description: 'New description' })

    mockSpecialtiesRepository.findById.mockResolvedValue(specialty as any)
    mockSpecialtiesRepository.update.mockResolvedValue(updated as any)

    await useCase.execute(specialty.id, { description: 'New description' })

    expect(mockSpecialtiesRepository.findByName).not.toHaveBeenCalled()
  })

  it('clears description when null is provided', async () => {
    const specialty = makeSpecialty({ description: 'Old description' })
    const updated = makeSpecialty({ id: specialty.id, description: null })

    mockSpecialtiesRepository.findById.mockResolvedValue(specialty as any)
    mockSpecialtiesRepository.update.mockResolvedValue(updated as any)

    const result = await useCase.execute(specialty.id, { description: null })

    expect(result.description).toBeNull()
    expect(mockSpecialtiesRepository.update).toHaveBeenCalledWith(specialty.id, { description: null })
  })

  it('throws ConflictException on optimistic lock version mismatch', async () => {
    const specialty = makeSpecialty()
    mockSpecialtiesRepository.findById.mockResolvedValue(specialty as any)
    mockSpecialtiesRepository.findByName.mockResolvedValue(null)
    mockSpecialtiesRepository.update.mockRejectedValue(
      new OptimisticLockVersionMismatchError('Specialty', 1, 2),
    )

    await expect(useCase.execute(specialty.id, { name: 'Neurologia' })).rejects.toThrow(ConflictException)
  })

  it('rethrows non-OptimisticLock errors from repository update', async () => {
    const specialty = makeSpecialty()
    mockSpecialtiesRepository.findById.mockResolvedValue(specialty as any)
    mockSpecialtiesRepository.update.mockRejectedValue(new Error('DB error'))

    await expect(useCase.execute(specialty.id, { description: 'Updated' })).rejects.toThrow('DB error')
  })

  it('invalidates individual and list caches after update', async () => {
    const specialty = makeSpecialty()
    const updated = makeSpecialty({ id: specialty.id })

    mockSpecialtiesRepository.findById.mockResolvedValue(specialty as any)
    mockSpecialtiesRepository.update.mockResolvedValue(updated as any)

    await useCase.execute(specialty.id, { description: 'Updated' })

    expect(mockCacheService.del).toHaveBeenCalledWith(`specialty:${specialty.id}`)
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith('specialties:list*')
  })

  it('continues when cache invalidation fails', async () => {
    const specialty = makeSpecialty()
    const updated = makeSpecialty({ id: specialty.id })

    mockSpecialtiesRepository.findById.mockResolvedValue(specialty as any)
    mockSpecialtiesRepository.update.mockResolvedValue(updated as any)
    mockCacheService.del.mockRejectedValue(new Error('Redis error'))

    const result = await useCase.execute(specialty.id, { description: 'Updated' })

    expect(result.id).toBeDefined()
  })
})
