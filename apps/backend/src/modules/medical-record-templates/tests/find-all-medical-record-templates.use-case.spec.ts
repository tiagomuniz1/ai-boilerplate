import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { ISpecialtiesRepository } from '../../specialties/repositories/specialties.repository.interface'
import { IMedicalRecordTemplatesRepository } from '../repositories/medical-record-templates.repository.interface'
import { FindAllMedicalRecordTemplatesUseCase } from '../use-cases/find-all-medical-record-templates.use-case'

const mockTemplatesRepository: jest.Mocked<IMedicalRecordTemplatesRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByClinicAndSpecialty: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockSpecialtiesRepository = {
  findByIds: jest.fn(),
} as unknown as jest.Mocked<ISpecialtiesRepository>

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
} as unknown as jest.Mocked<CacheService>

const clinicId = '10000000-0000-4000-8000-000000000000'
const currentUser: ICurrentUser = { id: 'u1', role: UserRole.ADMIN, clinicId }

const makeTemplate = (overrides = {}) => ({
  id: faker.string.uuid(),
  clinicId,
  specialtyId: 'spec-1',
  name: 'Template',
  fields: [],
  isActive: true,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

describe('FindAllMedicalRecordTemplatesUseCase', () => {
  let useCase: FindAllMedicalRecordTemplatesUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindAllMedicalRecordTemplatesUseCase(
      {} as DataSource,
      mockTemplatesRepository,
      mockSpecialtiesRepository,
      mockCacheService,
    )
  })

  it('returns cached result when cache hits', async () => {
    const cached = { data: [], total: 0, page: 1, limit: 20 }
    mockCacheService.get.mockResolvedValue(cached as any)

    const result = await useCase.execute({} as any, currentUser)

    expect(result).toBe(cached as any)
    expect(mockTemplatesRepository.findAll).not.toHaveBeenCalled()
  })

  it('queries repository on miss, resolves specialty names and caches', async () => {
    mockCacheService.get.mockResolvedValue(null)
    const template = makeTemplate()
    mockTemplatesRepository.findAll.mockResolvedValue([[template] as any, 1])
    mockSpecialtiesRepository.findByIds.mockResolvedValue([{ id: 'spec-1', name: 'Cardiologia' }] as any)

    const result = await useCase.execute({ specialtyId: 'spec-1' } as any, currentUser)

    expect(mockTemplatesRepository.findAll).toHaveBeenCalledWith(clinicId, 1, 20, 'spec-1', undefined, undefined)
    expect(result.data[0].specialtyName).toBe('Cardiologia')
    expect(result.total).toBe(1)
    expect(mockCacheService.set).toHaveBeenCalledWith(
      `medical_record_templates:list:${clinicId}:1:20:spec-1`,
      result,
      60,
    )
  })

  it('returns null specialtyName for a generalist template (null specialtyId)', async () => {
    mockCacheService.get.mockResolvedValue(null)
    const generalistTemplate = makeTemplate({ specialtyId: null })
    mockTemplatesRepository.findAll.mockResolvedValue([[generalistTemplate] as any, 1])
    mockSpecialtiesRepository.findByIds.mockResolvedValue([])

    const result = await useCase.execute({} as any, currentUser)

    expect(mockSpecialtiesRepository.findByIds).toHaveBeenCalledWith([])
    expect(result.data[0].specialtyId).toBeNull()
    expect(result.data[0].specialtyName).toBeNull()
  })

  it('forwards the generalist flag and uses a "generalist" cache key', async () => {
    mockCacheService.get.mockResolvedValue(null)
    const generalistTemplate = makeTemplate({ specialtyId: null })
    mockTemplatesRepository.findAll.mockResolvedValue([[generalistTemplate] as any, 1])
    mockSpecialtiesRepository.findByIds.mockResolvedValue([])

    const result = await useCase.execute({ generalist: true } as any, currentUser)

    expect(mockTemplatesRepository.findAll).toHaveBeenCalledWith(clinicId, 1, 20, undefined, true, undefined)
    expect(mockCacheService.get).toHaveBeenCalledWith(
      `medical_record_templates:list:${clinicId}:1:20:generalist`,
    )
    expect(mockCacheService.set).toHaveBeenCalledWith(
      `medical_record_templates:list:${clinicId}:1:20:generalist`,
      result,
      60,
    )
    expect(result.data[0].specialtyId).toBeNull()
  })

  it('forwards the councilType filter and uses it as the cache key', async () => {
    mockCacheService.get.mockResolvedValue(null)
    const generalistTemplate = makeTemplate({ specialtyId: null, councilType: 'crn' })
    mockTemplatesRepository.findAll.mockResolvedValue([[generalistTemplate] as any, 1])
    mockSpecialtiesRepository.findByIds.mockResolvedValue([])

    const result = await useCase.execute({ councilType: 'crn' } as any, currentUser)

    expect(mockTemplatesRepository.findAll).toHaveBeenCalledWith(clinicId, 1, 20, undefined, undefined, 'crn')
    expect(mockCacheService.get).toHaveBeenCalledWith(
      `medical_record_templates:list:${clinicId}:1:20:crn`,
    )
    expect(result.data[0].specialtyId).toBeNull()
  })

  it('uses "all" cache key and null name when specialty is missing', async () => {
    mockCacheService.get.mockResolvedValue(null)
    const template = makeTemplate()
    mockTemplatesRepository.findAll.mockResolvedValue([[template] as any, 1])
    mockSpecialtiesRepository.findByIds.mockResolvedValue([])

    const result = await useCase.execute({ page: 2, limit: 10 } as any, currentUser)

    expect(mockCacheService.get).toHaveBeenCalledWith(
      `medical_record_templates:list:${clinicId}:2:10:all`,
    )
    expect(result.data[0].specialtyName).toBeNull()
  })

  it('continues when cache read fails', async () => {
    mockCacheService.get.mockRejectedValue(new Error('Redis error'))
    mockTemplatesRepository.findAll.mockResolvedValue([[], 0])
    mockSpecialtiesRepository.findByIds.mockResolvedValue([])

    const result = await useCase.execute({} as any, currentUser)

    expect(result.total).toBe(0)
  })

  it('continues when cache write fails', async () => {
    mockCacheService.get.mockResolvedValue(null)
    mockCacheService.set.mockRejectedValue(new Error('Redis error'))
    mockTemplatesRepository.findAll.mockResolvedValue([[], 0])
    mockSpecialtiesRepository.findByIds.mockResolvedValue([])

    const result = await useCase.execute({} as any, currentUser)

    expect(result.data).toEqual([])
  })
})
