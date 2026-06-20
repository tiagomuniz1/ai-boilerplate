import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { MedicalRecordFieldType, UpdateCanonicalFieldDto } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { ISpecialtiesRepository } from '../../specialties/repositories/specialties.repository.interface'
import { IMedicalRecordCanonicalFieldsRepository } from '../repositories/medical-record-canonical-fields.repository.interface'
import { UpdateCanonicalFieldUseCase } from '../use-cases/update-canonical-field.use-case'

const mockRepository: jest.Mocked<IMedicalRecordCanonicalFieldsRepository> = {
  findForSuggestion: jest.fn(),
  findById: jest.fn(),
  findByCanonicalKey: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
}

const mockSpecialtiesRepository = {
  findById: jest.fn(),
} as unknown as jest.Mocked<ISpecialtiesRepository>

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
  specialtyId: null,
  description: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

describe('UpdateCanonicalFieldUseCase', () => {
  let useCase: UpdateCanonicalFieldUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new UpdateCanonicalFieldUseCase(
      {} as DataSource,
      mockRepository,
      mockSpecialtiesRepository,
      mockCacheService,
    )
  })

  it('throws NotFoundException when field does not exist', async () => {
    mockRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute('missing', { label: 'New' })).rejects.toThrow(NotFoundException)
    expect(mockRepository.update).not.toHaveBeenCalled()
  })

  it('updates label and invalidates cache', async () => {
    const field = makeField()
    mockRepository.findById.mockResolvedValue(field as any)
    mockRepository.update.mockResolvedValue(makeField({ id: field.id, label: 'Peso corporal' }) as any)
    mockCacheService.delByPattern.mockResolvedValue(undefined)

    const result = await useCase.execute(field.id, { label: 'Peso corporal' })

    expect(mockRepository.update).toHaveBeenCalledWith(field.id, { label: 'Peso corporal' })
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith('canonical_fields:list*')
    expect(result.label).toBe('Peso corporal')
  })

  it('toggles isActive', async () => {
    const field = makeField()
    mockRepository.findById.mockResolvedValue(field as any)
    mockRepository.update.mockResolvedValue(makeField({ id: field.id, isActive: false }) as any)

    const result = await useCase.execute(field.id, { isActive: false })

    expect(mockRepository.update).toHaveBeenCalledWith(field.id, { isActive: false })
    expect(result.isActive).toBe(false)
  })

  it('revalidates type/options when type changes to select without options', async () => {
    const field = makeField()
    mockRepository.findById.mockResolvedValue(field as any)

    const dto: UpdateCanonicalFieldDto = { type: MedicalRecordFieldType.SELECT }
    await expect(useCase.execute(field.id, dto)).rejects.toThrow(UnprocessableEntityException)
    expect(mockRepository.update).not.toHaveBeenCalled()
  })

  it('revalidates type/options when options change with duplicate values', async () => {
    const field = makeField({ type: MedicalRecordFieldType.SELECT, options: [{ value: 'low', label: 'Baixo' }] })
    mockRepository.findById.mockResolvedValue(field as any)

    await expect(
      useCase.execute(field.id, {
        options: [
          { value: 'low', label: 'Baixo' },
          { value: 'low', label: 'Outro' },
        ],
      }),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('rejects options on a non-select field', async () => {
    const field = makeField({ type: MedicalRecordFieldType.NUMBER })
    mockRepository.findById.mockResolvedValue(field as any)

    await expect(
      useCase.execute(field.id, { options: [{ value: 'x', label: 'X' }] }),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('clears options when an empty array is sent for a non-select field', async () => {
    const field = makeField({ type: MedicalRecordFieldType.NUMBER })
    mockRepository.findById.mockResolvedValue(field as any)
    mockRepository.update.mockResolvedValue(makeField({ id: field.id, options: null }) as any)

    await useCase.execute(field.id, { options: [] })

    expect(mockRepository.update).toHaveBeenCalledWith(field.id, { options: null })
  })

  it('throws when new specialtyId does not exist', async () => {
    const field = makeField()
    mockRepository.findById.mockResolvedValue(field as any)
    mockSpecialtiesRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(field.id, { specialtyId: 'missing' })).rejects.toThrow(
      UnprocessableEntityException,
    )
  })

  it('throws ConflictException when new canonicalKey already exists', async () => {
    const field = makeField({ canonicalKey: 'weight' })
    mockRepository.findById.mockResolvedValue(field as any)
    mockRepository.findByCanonicalKey.mockResolvedValue(makeField({ canonicalKey: 'height' }) as any)

    await expect(useCase.execute(field.id, { canonicalKey: 'height' })).rejects.toThrow(
      ConflictException,
    )
    expect(mockRepository.update).not.toHaveBeenCalled()
  })

  it('allows updating to a unique canonicalKey', async () => {
    const field = makeField({ canonicalKey: 'weight' })
    mockRepository.findById.mockResolvedValue(field as any)
    mockRepository.findByCanonicalKey.mockResolvedValue(null)
    mockRepository.update.mockResolvedValue(makeField({ id: field.id, canonicalKey: 'body_weight' }) as any)

    const result = await useCase.execute(field.id, { canonicalKey: 'body_weight' })

    expect(result.canonicalKey).toBe('body_weight')
  })

  it('does not check uniqueness when canonicalKey is unchanged', async () => {
    const field = makeField({ canonicalKey: 'weight' })
    mockRepository.findById.mockResolvedValue(field as any)
    mockRepository.update.mockResolvedValue(field as any)

    await useCase.execute(field.id, { canonicalKey: 'weight' })

    expect(mockRepository.findByCanonicalKey).not.toHaveBeenCalled()
  })

  it('updates type, unit and description with provided values', async () => {
    const field = makeField({ type: MedicalRecordFieldType.NUMBER })
    mockRepository.findById.mockResolvedValue(field as any)
    mockRepository.update.mockResolvedValue(
      makeField({ id: field.id, type: MedicalRecordFieldType.TEXTAREA }) as any,
    )

    await useCase.execute(field.id, {
      type: MedicalRecordFieldType.TEXTAREA,
      unit: 'cm',
      description: 'Descrição',
    })

    expect(mockRepository.update).toHaveBeenCalledWith(field.id, {
      type: MedicalRecordFieldType.TEXTAREA,
      unit: 'cm',
      description: 'Descrição',
    })
  })

  it('updates options to a new valid set and links a valid specialty', async () => {
    const field = makeField({
      type: MedicalRecordFieldType.SELECT,
      options: [{ value: 'low', label: 'Baixo' }],
    })
    mockRepository.findById.mockResolvedValue(field as any)
    mockSpecialtiesRepository.findById.mockResolvedValue({ id: 'spec-1' } as any)
    mockRepository.update.mockResolvedValue(field as any)

    const newOptions = [
      { value: 'low', label: 'Baixo' },
      { value: 'high', label: 'Alto' },
    ]
    await useCase.execute(field.id, { options: newOptions, specialtyId: 'spec-1' })

    expect(mockRepository.update).toHaveBeenCalledWith(field.id, {
      options: newOptions,
      specialtyId: 'spec-1',
    })
  })

  it('clears unit, specialtyId and description when null is provided', async () => {
    const field = makeField({ unit: 'kg', specialtyId: 'spec-1', description: 'old' })
    mockRepository.findById.mockResolvedValue(field as any)
    mockRepository.update.mockResolvedValue(field as any)

    await useCase.execute(field.id, {
      unit: null as any,
      specialtyId: null as any,
      description: null as any,
    })

    expect(mockRepository.update).toHaveBeenCalledWith(field.id, {
      unit: null,
      specialtyId: null,
      description: null,
    })
    expect(mockSpecialtiesRepository.findById).not.toHaveBeenCalled()
  })

  it('continues when cache invalidation fails', async () => {
    const field = makeField()
    mockRepository.findById.mockResolvedValue(field as any)
    mockRepository.update.mockResolvedValue(field as any)
    mockCacheService.delByPattern.mockRejectedValue(new Error('Redis error'))

    const result = await useCase.execute(field.id, { label: 'X' })

    expect(result.id).toBe(field.id)
  })
})
