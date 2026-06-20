import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { MedicalRecordFieldType, UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { CanonicalFieldListQueryDto } from '../dto/canonical-field-list-query.dto'
import { IMedicalRecordCanonicalFieldsRepository } from '../repositories/medical-record-canonical-fields.repository.interface'
import { FindCanonicalFieldsUseCase } from '../use-cases/find-canonical-fields.use-case'

const mockRepository: jest.Mocked<IMedicalRecordCanonicalFieldsRepository> = {
  findForSuggestion: jest.fn(),
  findById: jest.fn(),
  findByCanonicalKey: jest.fn(),
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

const makeField = (overrides = {}) => ({
  id: faker.string.uuid(),
  canonicalKey: 'weight',
  label: 'Peso',
  type: MedicalRecordFieldType.NUMBER,
  options: null,
  unit: 'kg',
  specialtyId: null,
  description: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const platformAdmin: ICurrentUser = { id: 'p1', role: UserRole.PLATFORM_ADMIN, clinicId: null }
const admin: ICurrentUser = { id: 'a1', role: UserRole.ADMIN, clinicId: 'c1' }

describe('FindCanonicalFieldsUseCase', () => {
  let useCase: FindCanonicalFieldsUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindCanonicalFieldsUseCase({} as DataSource, mockRepository, mockCacheService)
  })

  it('returns cached result when cache hits', async () => {
    const cached = [makeField()]
    mockCacheService.get.mockResolvedValue(cached as any)

    const result = await useCase.execute({} as CanonicalFieldListQueryDto, admin)

    expect(result).toBe(cached as any)
    expect(mockRepository.findForSuggestion).not.toHaveBeenCalled()
  })

  it('queries repository on cache miss and caches the result', async () => {
    const field = makeField()
    mockCacheService.get.mockResolvedValue(null)
    mockRepository.findForSuggestion.mockResolvedValue([field] as any)

    const result = await useCase.execute({ specialtyId: 'spec-1' } as CanonicalFieldListQueryDto, admin)

    expect(mockRepository.findForSuggestion).toHaveBeenCalledWith('spec-1', false)
    expect(mockCacheService.get).toHaveBeenCalledWith('canonical_fields:list:spec-1')
    expect(mockCacheService.set).toHaveBeenCalledWith('canonical_fields:list:spec-1', result, 600)
    expect(result[0].id).toBe(field.id)
  })

  it('uses "all" cache key when no specialtyId is provided', async () => {
    mockCacheService.get.mockResolvedValue(null)
    mockRepository.findForSuggestion.mockResolvedValue([])

    await useCase.execute({} as CanonicalFieldListQueryDto, admin)

    expect(mockCacheService.get).toHaveBeenCalledWith('canonical_fields:list:all')
    expect(mockRepository.findForSuggestion).toHaveBeenCalledWith(undefined, false)
  })

  it('respects includeInactive only for PLATFORM_ADMIN and bypasses cache', async () => {
    mockRepository.findForSuggestion.mockResolvedValue([])

    await useCase.execute({ includeInactive: true } as CanonicalFieldListQueryDto, platformAdmin)

    expect(mockRepository.findForSuggestion).toHaveBeenCalledWith(undefined, true)
    expect(mockCacheService.get).not.toHaveBeenCalled()
    expect(mockCacheService.set).not.toHaveBeenCalled()
  })

  it('ignores includeInactive for non-PLATFORM_ADMIN roles', async () => {
    mockCacheService.get.mockResolvedValue(null)
    mockRepository.findForSuggestion.mockResolvedValue([])

    await useCase.execute({ includeInactive: true } as CanonicalFieldListQueryDto, admin)

    expect(mockRepository.findForSuggestion).toHaveBeenCalledWith(undefined, false)
  })

  it('maps entity to response shape', async () => {
    mockCacheService.get.mockResolvedValue(null)
    const field = makeField({
      type: MedicalRecordFieldType.SELECT,
      options: [{ value: 'low', label: 'Baixo' }],
      specialtyId: 'spec-1',
    })
    mockRepository.findForSuggestion.mockResolvedValue([field] as any)

    const [result] = await useCase.execute({} as CanonicalFieldListQueryDto, admin)

    expect(result).toEqual({
      id: field.id,
      canonicalKey: field.canonicalKey,
      label: field.label,
      type: field.type,
      options: field.options,
      unit: field.unit,
      specialtyId: field.specialtyId,
      description: field.description,
      isActive: field.isActive,
    })
  })

  it('continues when cache read fails', async () => {
    mockCacheService.get.mockRejectedValue(new Error('Redis error'))
    mockRepository.findForSuggestion.mockResolvedValue([])

    const result = await useCase.execute({} as CanonicalFieldListQueryDto, admin)

    expect(result).toEqual([])
    expect(mockRepository.findForSuggestion).toHaveBeenCalled()
  })

  it('continues when cache write fails', async () => {
    mockCacheService.get.mockResolvedValue(null)
    mockCacheService.set.mockRejectedValue(new Error('Redis error'))
    mockRepository.findForSuggestion.mockResolvedValue([makeField()] as any)

    const result = await useCase.execute({} as CanonicalFieldListQueryDto, admin)

    expect(result).toHaveLength(1)
  })
})
