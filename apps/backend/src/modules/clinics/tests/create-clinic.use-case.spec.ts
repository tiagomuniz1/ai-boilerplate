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

const makeAddress = (overrides = {}) => ({
  street: 'Rua das Flores',
  number: '123',
  complement: null as string | null,
  neighborhood: 'Centro',
  city: 'São Paulo',
  state: 'SP',
  zipCode: '01310-100',
  country: 'BR',
  ...overrides,
})

const makeClinic = (overrides = {}) => ({
  id: faker.string.uuid(),
  name: 'Clínica do Coração',
  slug: 'clinica-do-coracao',
  isActive: true,
  version: 1,
  addressStreet: 'Rua das Flores',
  addressNumber: '123',
  addressComplement: null as string | null,
  addressNeighborhood: 'Centro',
  addressCity: 'São Paulo',
  addressState: 'SP',
  addressZipCode: '01310-100',
  addressCountry: 'BR',
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
    const dto = { name: 'Clínica do Coração', address: makeAddress() }
    const created = makeClinic()

    mockClinicsRepository.findBySlug.mockResolvedValue(null)
    mockClinicsRepository.create.mockResolvedValue(created as any)

    const result = await useCase.execute(dto)

    expect(mockClinicsRepository.create).toHaveBeenCalledWith({
      name: 'Clínica do Coração',
      slug: 'clnica-do-corao',
      themeId: null,
      address: dto.address,
    })
    expect(result.id).toBe(created.id)
    expect(result.slug).toBe(created.slug)
  })

  it('creates clinic with manually provided slug', async () => {
    const dto = { name: 'Clínica do Coração', slug: 'clinica-do-coracao', address: makeAddress() }
    const created = makeClinic()

    mockClinicsRepository.findBySlug.mockResolvedValue(null)
    mockClinicsRepository.create.mockResolvedValue(created as any)

    await useCase.execute(dto)

    expect(mockClinicsRepository.create).toHaveBeenCalledWith({
      name: 'Clínica do Coração',
      slug: 'clinica-do-coracao',
      themeId: null,
      address: dto.address,
    })
  })

  it('returns ClinicResponseDto with address fields', async () => {
    const dto = { name: 'Clínica do Coração', slug: 'clinica-do-coracao', address: makeAddress() }
    const created = makeClinic()

    mockClinicsRepository.findBySlug.mockResolvedValue(null)
    mockClinicsRepository.create.mockResolvedValue(created as any)

    const result = await useCase.execute(dto)

    expect(result.id).toBe(created.id)
    expect(result.name).toBe(created.name)
    expect(result.slug).toBe(created.slug)
    expect(result.isActive).toBe(true)
    expect(result.address).toEqual({
      street: 'Rua das Flores',
      number: '123',
      complement: null,
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310-100',
      country: 'BR',
    })
    expect(result.createdAt).toBe(created.createdAt)
    expect(result.updatedAt).toBe(created.updatedAt)
  })

  it('returns address as null when clinic has no address fields', async () => {
    const dto = { name: 'Clínica do Coração', slug: 'clinica-do-coracao', address: makeAddress() }
    const created = makeClinic({
      addressStreet: null,
      addressNumber: null,
      addressComplement: null,
      addressNeighborhood: null,
      addressCity: null,
      addressState: null,
      addressZipCode: null,
      addressCountry: null,
    })

    mockClinicsRepository.findBySlug.mockResolvedValue(null)
    mockClinicsRepository.create.mockResolvedValue(created as any)

    const result = await useCase.execute(dto)

    expect(result.address).toBeNull()
  })

  it('response does not contain version or deletedAt', async () => {
    const dto = { name: 'Clínica do Coração', slug: 'clinica-do-coracao', address: makeAddress() }
    mockClinicsRepository.findBySlug.mockResolvedValue(null)
    mockClinicsRepository.create.mockResolvedValue(makeClinic() as any)

    const result = await useCase.execute(dto)

    expect(result).not.toHaveProperty('version')
    expect(result).not.toHaveProperty('deletedAt')
  })

  it('throws ConflictException when slug is already in use', async () => {
    mockClinicsRepository.findBySlug.mockResolvedValue(makeClinic() as any)

    await expect(
      useCase.execute({ name: 'Outra Clínica', slug: 'clinica-do-coracao', address: makeAddress() }),
    ).rejects.toThrow(ConflictException)
    expect(mockClinicsRepository.create).not.toHaveBeenCalled()
  })

  it('includes complement in address when provided', async () => {
    const address = makeAddress({ complement: 'Apto 42' })
    const created = makeClinic({ addressComplement: 'Apto 42' })

    mockClinicsRepository.findBySlug.mockResolvedValue(null)
    mockClinicsRepository.create.mockResolvedValue(created as any)

    const result = await useCase.execute({ name: 'Clínica', slug: 'clinica', address })

    expect(result.address?.complement).toBe('Apto 42')
  })

  it('invalidates list cache after creation', async () => {
    mockClinicsRepository.findBySlug.mockResolvedValue(null)
    mockClinicsRepository.create.mockResolvedValue(makeClinic() as any)

    await useCase.execute({ name: 'Clínica do Coração', slug: 'clinica-do-coracao', address: makeAddress() })

    expect(mockCacheService.delByPattern).toHaveBeenCalledWith('clinics:list*')
  })

  it('continues when cache invalidation fails', async () => {
    mockClinicsRepository.findBySlug.mockResolvedValue(null)
    mockClinicsRepository.create.mockResolvedValue(makeClinic() as any)
    mockCacheService.delByPattern.mockRejectedValue(new Error('Redis error'))

    const result = await useCase.execute({ name: 'Clínica do Coração', slug: 'clinica-do-coracao', address: makeAddress() })

    expect(result.id).toBeDefined()
  })
})
