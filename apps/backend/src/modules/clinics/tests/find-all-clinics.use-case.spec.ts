import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { CacheService } from '../../../cache/cache.service'
import { IClinicsRepository } from '../repositories/clinics.repository.interface'
import { FindAllClinicsUseCase } from '../use-cases/find-all-clinics.use-case'

const mockClinicsRepository: jest.Mocked<IClinicsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findBySlug: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateLogo: jest.fn(),
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

describe('FindAllClinicsUseCase', () => {
  let useCase: FindAllClinicsUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindAllClinicsUseCase({} as DataSource, mockClinicsRepository, mockCacheService)
    mockCacheService.get.mockResolvedValue(null)
    mockCacheService.set.mockResolvedValue(undefined)
  })

  it('returns paginated clinics from repository on cache miss', async () => {
    const clinic = makeClinic()
    mockClinicsRepository.findAll.mockResolvedValue([[clinic] as any, 1])

    const result = await useCase.execute({ page: 1, limit: 20 })

    expect(result.data).toHaveLength(1)
    expect(result.total).toBe(1)
    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
  })

  it('returns cached result on cache hit without calling repository', async () => {
    const cached = {
      data: [makeClinic()],
      total: 1,
      page: 1,
      limit: 20,
    }
    mockCacheService.get.mockResolvedValue(cached)

    const result = await useCase.execute({ page: 1, limit: 20 })

    expect(result).toBe(cached)
    expect(mockClinicsRepository.findAll).not.toHaveBeenCalled()
  })

  it('uses correct cache key including search param', async () => {
    mockClinicsRepository.findAll.mockResolvedValue([[], 0])

    await useCase.execute({ page: 2, limit: 10, search: 'coracao' })

    expect(mockCacheService.get).toHaveBeenCalledWith('clinics:list:2:10:coracao')
    expect(mockCacheService.set).toHaveBeenCalledWith('clinics:list:2:10:coracao', expect.any(Object), 60)
  })

  it('uses "all" in cache key when search is absent', async () => {
    mockClinicsRepository.findAll.mockResolvedValue([[], 0])

    await useCase.execute({ page: 1, limit: 20 })

    expect(mockCacheService.get).toHaveBeenCalledWith('clinics:list:1:20:all')
  })

  it('response items do not contain version or deletedAt', async () => {
    mockClinicsRepository.findAll.mockResolvedValue([[makeClinic()] as any, 1])

    const result = await useCase.execute({ page: 1, limit: 20 })

    result.data.forEach((c) => {
      expect(c).not.toHaveProperty('version')
      expect(c).not.toHaveProperty('deletedAt')
    })
  })

  it('saves result to cache after repository fetch', async () => {
    const clinic = makeClinic()
    mockClinicsRepository.findAll.mockResolvedValue([[clinic] as any, 1])

    await useCase.execute({ page: 1, limit: 20 })

    expect(mockCacheService.set).toHaveBeenCalledWith(
      'clinics:list:1:20:all',
      expect.objectContaining({ total: 1 }),
      60,
    )
  })

  it('continues when cache read fails', async () => {
    mockCacheService.get.mockRejectedValue(new Error('Redis error'))
    mockClinicsRepository.findAll.mockResolvedValue([[], 0])

    const result = await useCase.execute({ page: 1, limit: 20 })

    expect(result.total).toBe(0)
  })

  it('continues when cache write fails', async () => {
    mockClinicsRepository.findAll.mockResolvedValue([[makeClinic()] as any, 1])
    mockCacheService.set.mockRejectedValue(new Error('Redis error'))

    const result = await useCase.execute({ page: 1, limit: 20 })

    expect(result.data).toHaveLength(1)
  })

  it('applies default page 1 and limit 20 when not provided in query', async () => {
    mockClinicsRepository.findAll.mockResolvedValue([[], 0])

    await useCase.execute({} as any)

    expect(mockCacheService.get).toHaveBeenCalledWith('clinics:list:1:20:all')
    expect(mockClinicsRepository.findAll).toHaveBeenCalledWith(1, 20, undefined)
  })

  it('returns address as null in list items when clinic has no address', async () => {
    const clinic = makeClinic({ addressStreet: null, addressNumber: null, addressNeighborhood: null, addressCity: null, addressState: null, addressZipCode: null, addressCountry: null })
    mockClinicsRepository.findAll.mockResolvedValue([[clinic] as any, 1])

    const result = await useCase.execute({ page: 1, limit: 20 })

    expect(result.data[0].address).toBeNull()
  })
})
