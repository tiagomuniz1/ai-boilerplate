import { ConflictException, NotFoundException } from '@nestjs/common'
import { DataSource, OptimisticLockVersionMismatchError } from 'typeorm'
import { faker } from '@faker-js/faker'
import { CacheService } from '../../../cache/cache.service'
import { IClinicsRepository } from '../repositories/clinics.repository.interface'
import { UpdateClinicUseCase } from '../use-cases/update-clinic.use-case'

const mockClinicsRepository: jest.Mocked<IClinicsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findBySlug: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
}

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  setIfNotExists: jest.fn(),
  delByPattern: jest.fn(),
} as unknown as jest.Mocked<CacheService>

const makeClinic = (overrides = {}) => ({
  id: faker.string.uuid(),
  name: 'Clínica do Coração',
  slug: 'clinica-do-coracao',
  isActive: true,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

describe('UpdateClinicUseCase', () => {
  let useCase: UpdateClinicUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new UpdateClinicUseCase({} as DataSource, mockClinicsRepository, mockCacheService)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)
  })

  it('updates clinic and returns response', async () => {
    const clinic = makeClinic()
    const updated = makeClinic({ id: clinic.id, name: 'Nova Clínica' })

    mockClinicsRepository.findById.mockResolvedValue(clinic as any)
    mockClinicsRepository.update.mockResolvedValue(updated as any)

    const result = await useCase.execute(clinic.id, { name: 'Nova Clínica' })

    expect(result.id).toBe(clinic.id)
    expect(result.name).toBe('Nova Clínica')
  })

  it('deactivates clinic via isActive false', async () => {
    const clinic = makeClinic()
    const updated = makeClinic({ id: clinic.id, isActive: false })

    mockClinicsRepository.findById.mockResolvedValue(clinic as any)
    mockClinicsRepository.update.mockResolvedValue(updated as any)

    const result = await useCase.execute(clinic.id, { isActive: false })

    expect(result.isActive).toBe(false)
  })

  it('response does not contain version or deletedAt', async () => {
    const clinic = makeClinic()
    const updated = makeClinic({ id: clinic.id })

    mockClinicsRepository.findById.mockResolvedValue(clinic as any)
    mockClinicsRepository.update.mockResolvedValue(updated as any)

    const result = await useCase.execute(clinic.id, { name: 'Nova Clínica' })

    expect(result).not.toHaveProperty('version')
    expect(result).not.toHaveProperty('deletedAt')
  })

  it('throws NotFoundException when clinic does not exist', async () => {
    mockClinicsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(faker.string.uuid(), { name: 'Nova Clínica' })).rejects.toThrow(
      NotFoundException,
    )
    expect(mockClinicsRepository.update).not.toHaveBeenCalled()
  })

  it('throws ConflictException when new slug is already in use by another clinic', async () => {
    const clinic = makeClinic({ slug: 'clinica-do-coracao' })
    const other = makeClinic({ slug: 'nova-clinica' })

    mockClinicsRepository.findById.mockResolvedValue(clinic as any)
    mockClinicsRepository.findBySlug.mockResolvedValue(other as any)

    await expect(
      useCase.execute(clinic.id, { slug: 'nova-clinica' }),
    ).rejects.toThrow(ConflictException)
    expect(mockClinicsRepository.update).not.toHaveBeenCalled()
  })

  it('does not check uniqueness when slug is unchanged', async () => {
    const clinic = makeClinic({ slug: 'clinica-do-coracao' })
    const updated = makeClinic({ id: clinic.id })

    mockClinicsRepository.findById.mockResolvedValue(clinic as any)
    mockClinicsRepository.update.mockResolvedValue(updated as any)

    await useCase.execute(clinic.id, { slug: 'clinica-do-coracao' })

    expect(mockClinicsRepository.findBySlug).not.toHaveBeenCalled()
  })

  it('does not check uniqueness when slug is not in dto', async () => {
    const clinic = makeClinic()
    const updated = makeClinic({ id: clinic.id, name: 'Nova Clínica' })

    mockClinicsRepository.findById.mockResolvedValue(clinic as any)
    mockClinicsRepository.update.mockResolvedValue(updated as any)

    await useCase.execute(clinic.id, { name: 'Nova Clínica' })

    expect(mockClinicsRepository.findBySlug).not.toHaveBeenCalled()
  })

  it('throws ConflictException on optimistic lock version mismatch', async () => {
    const clinic = makeClinic()
    mockClinicsRepository.findById.mockResolvedValue(clinic as any)
    mockClinicsRepository.update.mockRejectedValue(
      new OptimisticLockVersionMismatchError('Clinic', 1, 2),
    )

    await expect(useCase.execute(clinic.id, { name: 'Nova Clínica' })).rejects.toThrow(
      ConflictException,
    )
  })

  it('rethrows non-OptimisticLock errors from repository', async () => {
    const clinic = makeClinic()
    mockClinicsRepository.findById.mockResolvedValue(clinic as any)
    mockClinicsRepository.update.mockRejectedValue(new Error('DB error'))

    await expect(useCase.execute(clinic.id, { name: 'Nova Clínica' })).rejects.toThrow('DB error')
  })

  it('invalidates individual and list caches after update', async () => {
    const clinic = makeClinic()
    const updated = makeClinic({ id: clinic.id })

    mockClinicsRepository.findById.mockResolvedValue(clinic as any)
    mockClinicsRepository.update.mockResolvedValue(updated as any)

    await useCase.execute(clinic.id, { name: 'Nova Clínica' })

    expect(mockCacheService.del).toHaveBeenCalledWith(`clinic:${clinic.id}`)
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith('clinics:list*')
  })

  it('continues when cache invalidation fails', async () => {
    const clinic = makeClinic()
    const updated = makeClinic({ id: clinic.id })

    mockClinicsRepository.findById.mockResolvedValue(clinic as any)
    mockClinicsRepository.update.mockResolvedValue(updated as any)
    mockCacheService.del.mockRejectedValue(new Error('Redis error'))

    const result = await useCase.execute(clinic.id, { name: 'Nova Clínica' })

    expect(result.id).toBeDefined()
  })
})
