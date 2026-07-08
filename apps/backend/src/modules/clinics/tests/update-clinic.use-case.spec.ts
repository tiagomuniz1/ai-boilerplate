import { ConflictException, NotFoundException } from '@nestjs/common'
import { DataSource, OptimisticLockVersionMismatchError } from 'typeorm'
import { faker } from '@faker-js/faker'
import { CacheService } from '../../../cache/cache.service'
import { ClinicAssetUrlService } from '../../../common/services/clinic-asset-url.service'
import { IClinicsRepository } from '../repositories/clinics.repository.interface'
import { ClinicResponseMapper } from '../mappers/clinic-response.mapper'
import { UpdateClinicUseCase } from '../use-cases/update-clinic.use-case'

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

describe('UpdateClinicUseCase', () => {
  let useCase: UpdateClinicUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    const assetUrlService = { build: jest.fn().mockReturnValue('https://api.test/asset') } as unknown as ClinicAssetUrlService
    useCase = new UpdateClinicUseCase(
      {} as DataSource,
      mockClinicsRepository,
      mockCacheService,
      new ClinicResponseMapper(assetUrlService),
    )
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)
  })

  it('updates clinic name and returns response with existing address', async () => {
    const clinic = makeClinic()
    const updated = makeClinic({ id: clinic.id, name: 'Nova Clínica' })

    mockClinicsRepository.findById.mockResolvedValue(clinic as any)
    mockClinicsRepository.update.mockResolvedValue(updated as any)

    const result = await useCase.execute(clinic.id, { name: 'Nova Clínica' })

    expect(result.id).toBe(clinic.id)
    expect(result.name).toBe('Nova Clínica')
    expect(result.address).not.toBeNull()
  })

  it('updates address when address is provided', async () => {
    const clinic = makeClinic()
    const newAddress = makeAddress({ street: 'Av. Paulista', number: '1000', city: 'São Paulo' })
    const updated = makeClinic({
      id: clinic.id,
      addressStreet: 'Av. Paulista',
      addressNumber: '1000',
    })

    mockClinicsRepository.findById.mockResolvedValue(clinic as any)
    mockClinicsRepository.update.mockResolvedValue(updated as any)

    const result = await useCase.execute(clinic.id, { address: newAddress })

    expect(mockClinicsRepository.update).toHaveBeenCalledWith(clinic.id, { address: newAddress })
    expect(result.address?.street).toBe('Av. Paulista')
  })

  it('does not change address when address is not in dto', async () => {
    const clinic = makeClinic()
    const updated = makeClinic({ id: clinic.id, name: 'Nova Clínica' })

    mockClinicsRepository.findById.mockResolvedValue(clinic as any)
    mockClinicsRepository.update.mockResolvedValue(updated as any)

    await useCase.execute(clinic.id, { name: 'Nova Clínica' })

    expect(mockClinicsRepository.update).toHaveBeenCalledWith(clinic.id, { name: 'Nova Clínica' })
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

  it('throws ConflictException when new slug is "backoffice" (reserved)', async () => {
    const clinic = makeClinic({ slug: 'minha-clinica' })
    mockClinicsRepository.findById.mockResolvedValue(clinic as any)

    await expect(
      useCase.execute(clinic.id, { slug: 'backoffice' }),
    ).rejects.toThrow(new ConflictException('Slug is reserved and cannot be used'))
    expect(mockClinicsRepository.findBySlug).not.toHaveBeenCalled()
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

  it('returns address as null when updated clinic has no address', async () => {
    const clinic = makeClinic()
    const updated = makeClinic({ id: clinic.id, addressStreet: null, addressNumber: null, addressNeighborhood: null, addressCity: null, addressState: null, addressZipCode: null, addressCountry: null })

    mockClinicsRepository.findById.mockResolvedValue(clinic as any)
    mockClinicsRepository.update.mockResolvedValue(updated as any)

    const result = await useCase.execute(clinic.id, { name: 'Nova Clínica' })

    expect(result.address).toBeNull()
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

  it('invalidates theme cache when themeId is present in dto', async () => {
    const clinic = makeClinic()
    const updated = makeClinic({ id: clinic.id, themeId: 'theme-uuid-1' })

    mockClinicsRepository.findById.mockResolvedValue(clinic as any)
    mockClinicsRepository.update.mockResolvedValue(updated as any)

    await useCase.execute(clinic.id, { themeId: 'theme-uuid-1' } as any)

    expect(mockCacheService.del).toHaveBeenCalledWith(`theme:clinic:${clinic.id}`)
  })
})
