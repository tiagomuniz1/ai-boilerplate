import { ConflictException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { CacheService } from '../../../cache/cache.service'
import { IClinicsRepository } from '../repositories/clinics.repository.interface'
import { CreateClinicUseCase } from '../use-cases/create-clinic.use-case'

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

describe('CreateClinicUseCase', () => {
  let useCase: CreateClinicUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new CreateClinicUseCase({} as DataSource, mockClinicsRepository, mockCacheService)
    mockCacheService.delByPattern.mockResolvedValue(undefined)
  })

  it('creates clinic with generated slug when not provided', async () => {
    const dto = { name: 'Clínica do Coração' }
    const created = makeClinic()

    mockClinicsRepository.findBySlug.mockResolvedValue(null)
    mockClinicsRepository.create.mockResolvedValue(created as any)

    const result = await useCase.execute(dto)

    expect(mockClinicsRepository.create).toHaveBeenCalledWith({
      name: 'Clínica do Coração',
      slug: 'clnica-do-corao',
    })
    expect(result.id).toBe(created.id)
    expect(result.slug).toBe(created.slug)
  })

  it('creates clinic with manually provided slug', async () => {
    const dto = { name: 'Clínica do Coração', slug: 'clinica-do-coracao' }
    const created = makeClinic()

    mockClinicsRepository.findBySlug.mockResolvedValue(null)
    mockClinicsRepository.create.mockResolvedValue(created as any)

    await useCase.execute(dto)

    expect(mockClinicsRepository.create).toHaveBeenCalledWith({
      name: 'Clínica do Coração',
      slug: 'clinica-do-coracao',
    })
  })

  it('returns ClinicResponseDto with correct fields', async () => {
    const dto = { name: 'Clínica do Coração', slug: 'clinica-do-coracao' }
    const created = makeClinic()

    mockClinicsRepository.findBySlug.mockResolvedValue(null)
    mockClinicsRepository.create.mockResolvedValue(created as any)

    const result = await useCase.execute(dto)

    expect(result.id).toBe(created.id)
    expect(result.name).toBe(created.name)
    expect(result.slug).toBe(created.slug)
    expect(result.isActive).toBe(true)
    expect(result.createdAt).toBe(created.createdAt)
    expect(result.updatedAt).toBe(created.updatedAt)
  })

  it('response does not contain version or deletedAt', async () => {
    const dto = { name: 'Clínica do Coração', slug: 'clinica-do-coracao' }
    mockClinicsRepository.findBySlug.mockResolvedValue(null)
    mockClinicsRepository.create.mockResolvedValue(makeClinic() as any)

    const result = await useCase.execute(dto)

    expect(result).not.toHaveProperty('version')
    expect(result).not.toHaveProperty('deletedAt')
  })

  it('throws ConflictException when slug is already in use', async () => {
    mockClinicsRepository.findBySlug.mockResolvedValue(makeClinic() as any)

    await expect(
      useCase.execute({ name: 'Outra Clínica', slug: 'clinica-do-coracao' }),
    ).rejects.toThrow(ConflictException)
    expect(mockClinicsRepository.create).not.toHaveBeenCalled()
  })

  it('invalidates list cache after creation', async () => {
    mockClinicsRepository.findBySlug.mockResolvedValue(null)
    mockClinicsRepository.create.mockResolvedValue(makeClinic() as any)

    await useCase.execute({ name: 'Clínica do Coração', slug: 'clinica-do-coracao' })

    expect(mockCacheService.delByPattern).toHaveBeenCalledWith('clinics:list*')
  })

  it('continues when cache invalidation fails', async () => {
    mockClinicsRepository.findBySlug.mockResolvedValue(null)
    mockClinicsRepository.create.mockResolvedValue(makeClinic() as any)
    mockCacheService.delByPattern.mockRejectedValue(new Error('Redis error'))

    const result = await useCase.execute({ name: 'Clínica do Coração', slug: 'clinica-do-coracao' })

    expect(result.id).toBeDefined()
  })
})
