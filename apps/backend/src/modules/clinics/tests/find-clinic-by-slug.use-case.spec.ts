import { NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { CacheService } from '../../../cache/cache.service'
import { IClinicsRepository } from '../repositories/clinics.repository.interface'
import { FindClinicBySlugUseCase } from '../use-cases/find-clinic-by-slug.use-case'

const mockClinicsRepository: jest.Mocked<IClinicsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findBySlug: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateLogo: jest.fn(),
  updateLogoDark: jest.fn(),
  updateFavicon: jest.fn(),
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
  themeId: null as string | null,
  logoUrl: null as string | null,
  logoDarkUrl: null as string | null,
  faviconUrl: null as string | null,
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

describe('FindClinicBySlugUseCase', () => {
  let useCase: FindClinicBySlugUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindClinicBySlugUseCase({} as DataSource, mockClinicsRepository, mockCacheService)
    mockCacheService.get.mockResolvedValue(null)
    mockCacheService.set.mockResolvedValue(undefined)
  })

  it('returns clinic from repository on cache miss', async () => {
    const clinic = makeClinic()
    mockClinicsRepository.findBySlug.mockResolvedValue(clinic as any)

    const result = await useCase.execute(clinic.slug)

    expect(result.id).toBe(clinic.id)
    expect(result.name).toBe(clinic.name)
    expect(result.slug).toBe(clinic.slug)
    expect(result.isActive).toBe(true)
  })

  it('returns cached result on cache hit without calling repository', async () => {
    const clinic = makeClinic()
    const cached = { id: clinic.id, name: clinic.name, slug: clinic.slug, isActive: true, address: null, createdAt: clinic.createdAt, updatedAt: clinic.updatedAt }
    mockCacheService.get.mockResolvedValue(cached)

    const result = await useCase.execute(clinic.slug)

    expect(result).toBe(cached)
    expect(mockClinicsRepository.findBySlug).not.toHaveBeenCalled()
  })

  it('uses correct cache key', async () => {
    const clinic = makeClinic()
    mockClinicsRepository.findBySlug.mockResolvedValue(clinic as any)

    await useCase.execute(clinic.slug)

    expect(mockCacheService.get).toHaveBeenCalledWith(`clinic:slug:${clinic.slug}`)
    expect(mockCacheService.set).toHaveBeenCalledWith(`clinic:slug:${clinic.slug}`, expect.any(Object), 300)
  })

  it('throws NotFoundException when clinic does not exist', async () => {
    mockClinicsRepository.findBySlug.mockResolvedValue(null)

    await expect(useCase.execute('slug-inexistente')).rejects.toThrow(NotFoundException)
  })

  it('response does not contain version or deletedAt', async () => {
    mockClinicsRepository.findBySlug.mockResolvedValue(makeClinic() as any)

    const result = await useCase.execute('clinica-do-coracao')

    expect(result).not.toHaveProperty('version')
    expect(result).not.toHaveProperty('deletedAt')
  })

  it('continues when cache read fails', async () => {
    const clinic = makeClinic()
    mockCacheService.get.mockRejectedValue(new Error('Redis error'))
    mockClinicsRepository.findBySlug.mockResolvedValue(clinic as any)

    const result = await useCase.execute(clinic.slug)

    expect(result.id).toBe(clinic.id)
  })

  it('continues when cache write fails', async () => {
    const clinic = makeClinic()
    mockClinicsRepository.findBySlug.mockResolvedValue(clinic as any)
    mockCacheService.set.mockRejectedValue(new Error('Redis error'))

    const result = await useCase.execute(clinic.slug)

    expect(result.id).toBe(clinic.id)
  })

  it('returns address as null when clinic has no address', async () => {
    const clinic = makeClinic({
      addressStreet: null, addressNumber: null, addressNeighborhood: null,
      addressCity: null, addressState: null, addressZipCode: null, addressCountry: null,
    })
    mockClinicsRepository.findBySlug.mockResolvedValue(clinic as any)

    const result = await useCase.execute(clinic.slug)

    expect(result.address).toBeNull()
  })
})
