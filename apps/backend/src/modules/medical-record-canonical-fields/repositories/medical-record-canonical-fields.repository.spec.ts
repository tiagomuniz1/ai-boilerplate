import { Repository } from 'typeorm'
import { faker } from '@faker-js/faker'
import { MedicalRecordFieldType } from '@app/shared'
import { MedicalRecordCanonicalField } from '../entities/medical-record-canonical-field.entity'
import { MedicalRecordCanonicalFieldsRepository } from './medical-record-canonical-fields.repository'

function makeQueryBuilder() {
  return {
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  }
}

function makeRepo(): jest.Mocked<Repository<MedicalRecordCanonicalField>> {
  return {
    createQueryBuilder: jest.fn(),
    findOneBy: jest.fn(),
    findOneByOrFail: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  } as unknown as jest.Mocked<Repository<MedicalRecordCanonicalField>>
}

function makeField(overrides = {}): MedicalRecordCanonicalField {
  return {
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
  } as MedicalRecordCanonicalField
}

describe('MedicalRecordCanonicalFieldsRepository', () => {
  let repo: jest.Mocked<Repository<MedicalRecordCanonicalField>>
  let repository: MedicalRecordCanonicalFieldsRepository

  beforeEach(() => {
    jest.clearAllMocks()
    repo = makeRepo()
    repository = new MedicalRecordCanonicalFieldsRepository(repo)
  })

  describe('findForSuggestion', () => {
    it('returns only generals (active) when no specialtyId is provided', async () => {
      const qb = makeQueryBuilder()
      const fields = [makeField()]
      qb.getMany.mockResolvedValue(fields)
      repo.createQueryBuilder.mockReturnValue(qb as any)

      const result = await repository.findForSuggestion(undefined, false)

      expect(qb.andWhere).toHaveBeenCalledWith('field.isActive = :isActive', { isActive: true })
      expect(qb.andWhere).toHaveBeenCalledWith('field.specialtyId IS NULL')
      expect(qb.orderBy).toHaveBeenCalledWith('field.specialtyId', 'ASC', 'NULLS FIRST')
      expect(qb.addOrderBy).toHaveBeenCalledWith('field.label', 'ASC')
      expect(result).toBe(fields)
    })

    it('returns generals and specialty-specific fields when specialtyId is provided', async () => {
      const qb = makeQueryBuilder()
      qb.getMany.mockResolvedValue([])
      repo.createQueryBuilder.mockReturnValue(qb as any)

      await repository.findForSuggestion('spec-1', false)

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(field.specialtyId IS NULL OR field.specialtyId = :specialtyId)',
        { specialtyId: 'spec-1' },
      )
    })

    it('does not filter by isActive when includeInactive is true', async () => {
      const qb = makeQueryBuilder()
      qb.getMany.mockResolvedValue([])
      repo.createQueryBuilder.mockReturnValue(qb as any)

      await repository.findForSuggestion(undefined, true)

      expect(qb.andWhere).not.toHaveBeenCalledWith('field.isActive = :isActive', { isActive: true })
    })
  })

  describe('findById', () => {
    it('returns field when found', async () => {
      const field = makeField()
      repo.findOneBy.mockResolvedValue(field)

      const result = await repository.findById(field.id)

      expect(repo.findOneBy).toHaveBeenCalledWith({ id: field.id })
      expect(result).toBe(field)
    })

    it('returns null when not found', async () => {
      repo.findOneBy.mockResolvedValue(null)

      const result = await repository.findById(faker.string.uuid())

      expect(result).toBeNull()
    })
  })

  describe('findByCanonicalKey', () => {
    it('returns field matching the canonical key', async () => {
      const field = makeField()
      repo.findOneBy.mockResolvedValue(field)

      const result = await repository.findByCanonicalKey('weight')

      expect(repo.findOneBy).toHaveBeenCalledWith({ canonicalKey: 'weight' })
      expect(result).toBe(field)
    })
  })

  describe('create', () => {
    it('creates and saves a field', async () => {
      const field = makeField()
      repo.create.mockReturnValue(field)
      repo.save.mockResolvedValue(field)

      const data = { canonicalKey: 'weight' }
      const result = await repository.create(data)

      expect(repo.create).toHaveBeenCalledWith(data)
      expect(repo.save).toHaveBeenCalledWith(field)
      expect(result).toBe(field)
    })

    it('uses queryRunner repository when provided', async () => {
      const field = makeField()
      const qrRepo = {
        create: jest.fn().mockReturnValue(field),
        save: jest.fn().mockResolvedValue(field),
      }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } }

      const result = await repository.create({ canonicalKey: 'weight' }, queryRunner as any)

      expect(queryRunner.manager.getRepository).toHaveBeenCalledWith(MedicalRecordCanonicalField)
      expect(result).toBe(field)
      expect(repo.create).not.toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('loads field, merges data, and saves', async () => {
      const field = makeField()
      const mutable = { ...field }
      repo.findOneByOrFail.mockResolvedValue(mutable as any)
      repo.save.mockResolvedValue({ ...mutable, label: 'Novo' } as any)

      const result = await repository.update(field.id, { label: 'Novo' })

      expect(repo.findOneByOrFail).toHaveBeenCalledWith({ id: field.id })
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ label: 'Novo' }))
      expect(result.label).toBe('Novo')
    })

    it('uses queryRunner repository when provided', async () => {
      const field = makeField()
      const qrRepo = {
        findOneByOrFail: jest.fn().mockResolvedValue({ ...field }),
        save: jest.fn().mockResolvedValue(field),
      }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } }

      const result = await repository.update(field.id, { label: 'X' }, queryRunner as any)

      expect(queryRunner.manager.getRepository).toHaveBeenCalledWith(MedicalRecordCanonicalField)
      expect(result).toBe(field)
      expect(repo.findOneByOrFail).not.toHaveBeenCalled()
    })
  })
})
