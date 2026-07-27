import { NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { MedicalRecordFieldType } from '@app/shared'
import { IMedicalRecordCanonicalFieldsRepository } from '../repositories/medical-record-canonical-fields.repository.interface'
import { FindCanonicalFieldByIdUseCase } from '../use-cases/find-canonical-field-by-id.use-case'

const mockRepository: jest.Mocked<IMedicalRecordCanonicalFieldsRepository> = {
  findForSuggestion: jest.fn(),
  findById: jest.fn(),
  findByCanonicalKey: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
}

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

describe('FindCanonicalFieldByIdUseCase', () => {
  let useCase: FindCanonicalFieldByIdUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindCanonicalFieldByIdUseCase({} as DataSource, mockRepository)
  })

  it('returns the mapped response when the field exists', async () => {
    const field = makeField()
    mockRepository.findById.mockResolvedValue(field as any)

    const result = await useCase.execute(field.id)

    expect(mockRepository.findById).toHaveBeenCalledWith(field.id)
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

  it('throws NotFoundException when the field does not exist', async () => {
    mockRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute('missing-id')).rejects.toThrow(NotFoundException)
  })
})
