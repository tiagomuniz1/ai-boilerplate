import { NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { SubscriptionPlan } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { ClinicAssetUrlService } from '../../../common/services/clinic-asset-url.service'
import { IClinicsRepository } from '../repositories/clinics.repository.interface'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { ClinicResponseMapper } from '../mappers/clinic-response.mapper'
import { FindClinicByIdUseCase } from '../use-cases/find-clinic-by-id.use-case'

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

const mockProfessionalsRepository = {
  countByClinic: jest.fn(),
} as unknown as jest.Mocked<IProfessionalsRepository>

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
  plan: SubscriptionPlan.FREE,
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

describe('FindClinicByIdUseCase', () => {
  let useCase: FindClinicByIdUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    const assetUrlService = { build: jest.fn().mockReturnValue('https://api.test/asset') } as unknown as ClinicAssetUrlService
    useCase = new FindClinicByIdUseCase(
      {} as DataSource,
      mockClinicsRepository,
      mockProfessionalsRepository,
      mockCacheService,
      new ClinicResponseMapper(assetUrlService),
    )
    mockCacheService.get.mockResolvedValue(null)
    mockCacheService.set.mockResolvedValue(undefined)
    mockProfessionalsRepository.countByClinic.mockResolvedValue(0)
  })

  it('populates professionalCount from the professionals repository', async () => {
    const clinic = makeClinic()
    mockClinicsRepository.findById.mockResolvedValue(clinic as any)
    mockProfessionalsRepository.countByClinic.mockResolvedValue(3)

    const result = await useCase.execute(clinic.id)

    expect(mockProfessionalsRepository.countByClinic).toHaveBeenCalledWith(clinic.id)
    expect(result.professionalCount).toBe(3)
  })

  it('returns clinic from repository on cache miss', async () => {
    const clinic = makeClinic()
    mockClinicsRepository.findById.mockResolvedValue(clinic as any)

    const result = await useCase.execute(clinic.id)

    expect(result.id).toBe(clinic.id)
    expect(result.name).toBe(clinic.name)
    expect(result.slug).toBe(clinic.slug)
    expect(result.isActive).toBe(true)
  })

  it('returns cached result on cache hit without calling repository', async () => {
    const clinic = makeClinic()
    const cached = { id: clinic.id, name: clinic.name, slug: clinic.slug, isActive: true, address: null, createdAt: clinic.createdAt, updatedAt: clinic.updatedAt }
    mockCacheService.get.mockResolvedValue(cached)

    const result = await useCase.execute(clinic.id)

    expect(result).toBe(cached)
    expect(mockClinicsRepository.findById).not.toHaveBeenCalled()
  })

  it('uses correct cache key', async () => {
    const clinic = makeClinic()
    mockClinicsRepository.findById.mockResolvedValue(clinic as any)

    await useCase.execute(clinic.id)

    expect(mockCacheService.get).toHaveBeenCalledWith(`clinic:${clinic.id}`)
    expect(mockCacheService.set).toHaveBeenCalledWith(`clinic:${clinic.id}`, expect.any(Object), 300)
  })

  it('throws NotFoundException when clinic does not exist', async () => {
    mockClinicsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(faker.string.uuid())).rejects.toThrow(NotFoundException)
  })

  it('response does not contain version or deletedAt', async () => {
    mockClinicsRepository.findById.mockResolvedValue(makeClinic() as any)

    const result = await useCase.execute(faker.string.uuid())

    expect(result).not.toHaveProperty('version')
    expect(result).not.toHaveProperty('deletedAt')
  })

  it('continues when cache read fails', async () => {
    const clinic = makeClinic()
    mockCacheService.get.mockRejectedValue(new Error('Redis error'))
    mockClinicsRepository.findById.mockResolvedValue(clinic as any)

    const result = await useCase.execute(clinic.id)

    expect(result.id).toBe(clinic.id)
  })

  it('returns address as null when clinic has no address', async () => {
    const clinic = makeClinic({ addressStreet: null, addressNumber: null, addressNeighborhood: null, addressCity: null, addressState: null, addressZipCode: null, addressCountry: null })
    mockClinicsRepository.findById.mockResolvedValue(clinic as any)

    const result = await useCase.execute(clinic.id)

    expect(result.address).toBeNull()
  })

  it('continues when cache write fails', async () => {
    const clinic = makeClinic()
    mockClinicsRepository.findById.mockResolvedValue(clinic as any)
    mockCacheService.set.mockRejectedValue(new Error('Redis error'))

    const result = await useCase.execute(clinic.id)

    expect(result.id).toBe(clinic.id)
  })
})
