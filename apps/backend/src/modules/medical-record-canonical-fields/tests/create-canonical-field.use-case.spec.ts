import { ConflictException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { CreateCanonicalFieldDto, MedicalRecordFieldType } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { IMedicalRecordCanonicalFieldsRepository } from '../repositories/medical-record-canonical-fields.repository.interface'
import { CreateCanonicalFieldUseCase } from '../use-cases/create-canonical-field.use-case'

const mockRepository: jest.Mocked<IMedicalRecordCanonicalFieldsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByCanonicalKey: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
}

const mockCacheService = {
  delByPattern: jest.fn(),
} as unknown as jest.Mocked<CacheService>

const makeField = (overrides = {}) => ({
  id: faker.string.uuid(),
  canonicalKey: 'weight',
  label: 'Peso',
  type: MedicalRecordFieldType.NUMBER,
  options: null,
  unit: 'kg',
  description: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

describe('CreateCanonicalFieldUseCase', () => {
  let useCase: CreateCanonicalFieldUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new CreateCanonicalFieldUseCase(
      {} as DataSource,
      mockRepository,
      mockCacheService,
    )
  })

  const baseDto: CreateCanonicalFieldDto = {
    canonicalKey: 'weight',
    label: 'Peso',
    type: MedicalRecordFieldType.NUMBER,
  }

  it('creates a general field and returns response', async () => {
    const created = makeField()
    mockRepository.findByCanonicalKey.mockResolvedValue(null)
    mockRepository.create.mockResolvedValue(created as any)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(baseDto)

    expect(mockRepository.create).toHaveBeenCalledWith({
      canonicalKey: 'weight',
      label: 'Peso',
      type: MedicalRecordFieldType.NUMBER,
      options: null,
      unit: null,
      description: null,
    })
    expect(result.id).toBe(created.id)
    expect(result.isActive).toBe(true)
  })

  it('persists options for select fields', async () => {
    const dto: CreateCanonicalFieldDto = {
      canonicalKey: 'risk_level',
      label: 'Nível de risco',
      type: MedicalRecordFieldType.SELECT,
      options: [
        { value: 'low', label: 'Baixo' },
        { value: 'high', label: 'Alto' },
      ],
    }
    mockRepository.findByCanonicalKey.mockResolvedValue(null)
    mockRepository.create.mockResolvedValue(makeField({ ...dto, options: dto.options }) as any)

    await useCase.execute(dto)

    expect(mockRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ options: dto.options }),
    )
  })

  it('throws when select field has no options', async () => {
    await expect(
      useCase.execute({ ...baseDto, type: MedicalRecordFieldType.SELECT }),
    ).rejects.toThrow(UnprocessableEntityException)
    expect(mockRepository.create).not.toHaveBeenCalled()
  })

  it('throws when select field has duplicate option values', async () => {
    await expect(
      useCase.execute({
        canonicalKey: 'risk_level',
        label: 'Risco',
        type: MedicalRecordFieldType.SELECT,
        options: [
          { value: 'low', label: 'Baixo' },
          { value: 'low', label: 'Outro' },
        ],
      }),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws when non-select field provides options', async () => {
    await expect(
      useCase.execute({ ...baseDto, options: [{ value: 'x', label: 'X' }] }),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws ConflictException when canonicalKey already exists', async () => {
    mockRepository.findByCanonicalKey.mockResolvedValue(makeField() as any)

    await expect(useCase.execute(baseDto)).rejects.toThrow(ConflictException)
    expect(mockRepository.create).not.toHaveBeenCalled()
  })

  it('invalidates list cache after creation', async () => {
    mockRepository.findByCanonicalKey.mockResolvedValue(null)
    mockRepository.create.mockResolvedValue(makeField() as any)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    await useCase.execute(baseDto)

    expect(mockCacheService.delByPattern).toHaveBeenCalledWith('canonical_fields:list*')
  })

  it('continues when cache invalidation fails', async () => {
    mockRepository.findByCanonicalKey.mockResolvedValue(null)
    mockRepository.create.mockResolvedValue(makeField() as any)
    mockCacheService.delByPattern.mockRejectedValue(new Error('Redis error'))

    const result = await useCase.execute(baseDto)

    expect(result.id).toBeDefined()
  })
})
