import { ConflictException, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { CacheService } from '../../../cache/cache.service'
import { FindClinicByIdUseCase } from '../../clinics/use-cases/find-clinic-by-id.use-case'
import { ISpecialtiesRepository } from '../../specialties/repositories/specialties.repository.interface'
import { IClinicSpecialtiesRepository } from '../repositories/clinic-specialties.repository.interface'
import { LinkSpecialtyToClinicUseCase } from '../use-cases/link-specialty-to-clinic.use-case'

const mockClinicSpecialtiesRepository: jest.Mocked<IClinicSpecialtiesRepository> = {
  findByClinicId: jest.fn(),
  findByClinicAndSpecialty: jest.fn(),
  link: jest.fn(),
  unlink: jest.fn(),
}

const mockFindClinicByIdUseCase = {
  execute: jest.fn(),
} as unknown as jest.Mocked<FindClinicByIdUseCase>

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

const makeClinicSpecialty = (clinicId: string, specialtyId: string, overrides = {}) => ({
  id: faker.string.uuid(),
  clinicId,
  specialtyId,
  createdAt: new Date(),
  ...overrides,
})

describe('LinkSpecialtyToClinicUseCase', () => {
  let useCase: LinkSpecialtyToClinicUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new LinkSpecialtyToClinicUseCase(
      {} as DataSource,
      mockClinicSpecialtiesRepository,
      mockFindClinicByIdUseCase,
      mockSpecialtiesRepository,
      mockCacheService,
    )
  })

  it('links specialty to clinic and returns response', async () => {
    const clinicId = faker.string.uuid()
    const specialty = makeSpecialty()
    const record = makeClinicSpecialty(clinicId, specialty.id)

    mockFindClinicByIdUseCase.execute.mockResolvedValue({} as any)
    mockSpecialtiesRepository.findById.mockResolvedValue(specialty as any)
    mockClinicSpecialtiesRepository.findByClinicAndSpecialty.mockResolvedValue(null)
    mockClinicSpecialtiesRepository.link.mockResolvedValue(record as any)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(clinicId, specialty.id)

    expect(result.id).toBe(record.id)
    expect(result.clinicId).toBe(clinicId)
    expect(result.specialtyId).toBe(specialty.id)
    expect(result.name).toBe(specialty.name)
    expect(result.description).toBeNull()
    expect(result.linkedAt).toBe(record.createdAt)
  })

  it('throws NotFoundException when clinic does not exist', async () => {
    mockFindClinicByIdUseCase.execute.mockRejectedValue(new NotFoundException('Clinic not found'))

    await expect(
      useCase.execute(faker.string.uuid(), faker.string.uuid()),
    ).rejects.toThrow(NotFoundException)

    expect(mockClinicSpecialtiesRepository.link).not.toHaveBeenCalled()
  })

  it('throws NotFoundException when specialty does not exist', async () => {
    mockFindClinicByIdUseCase.execute.mockResolvedValue({} as any)
    mockSpecialtiesRepository.findById.mockResolvedValue(null)

    await expect(
      useCase.execute(faker.string.uuid(), faker.string.uuid()),
    ).rejects.toThrow(NotFoundException)

    expect(mockClinicSpecialtiesRepository.link).not.toHaveBeenCalled()
  })

  it('throws ConflictException when specialty is already linked', async () => {
    const clinicId = faker.string.uuid()
    const specialty = makeSpecialty()
    const existing = makeClinicSpecialty(clinicId, specialty.id)

    mockFindClinicByIdUseCase.execute.mockResolvedValue({} as any)
    mockSpecialtiesRepository.findById.mockResolvedValue(specialty as any)
    mockClinicSpecialtiesRepository.findByClinicAndSpecialty.mockResolvedValue(existing as any)

    await expect(useCase.execute(clinicId, specialty.id)).rejects.toThrow(ConflictException)

    expect(mockClinicSpecialtiesRepository.link).not.toHaveBeenCalled()
  })

  it('invalidates clinic cache after linking', async () => {
    const clinicId = faker.string.uuid()
    const specialty = makeSpecialty()
    const record = makeClinicSpecialty(clinicId, specialty.id)

    mockFindClinicByIdUseCase.execute.mockResolvedValue({} as any)
    mockSpecialtiesRepository.findById.mockResolvedValue(specialty as any)
    mockClinicSpecialtiesRepository.findByClinicAndSpecialty.mockResolvedValue(null)
    mockClinicSpecialtiesRepository.link.mockResolvedValue(record as any)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute(clinicId, specialty.id)

    expect(mockCacheService.delByPattern).toHaveBeenCalledWith(`clinic-specialties:${clinicId}*`)
  })

  it('continues when cache invalidation fails', async () => {
    const clinicId = faker.string.uuid()
    const specialty = makeSpecialty()
    const record = makeClinicSpecialty(clinicId, specialty.id)

    mockFindClinicByIdUseCase.execute.mockResolvedValue({} as any)
    mockSpecialtiesRepository.findById.mockResolvedValue(specialty as any)
    mockClinicSpecialtiesRepository.findByClinicAndSpecialty.mockResolvedValue(null)
    mockClinicSpecialtiesRepository.link.mockResolvedValue(record as any)
    mockCacheService.delByPattern.mockRejectedValue(new Error('Redis error'))

    const result = await useCase.execute(clinicId, specialty.id)

    expect(result.id).toBeDefined()
  })
})
