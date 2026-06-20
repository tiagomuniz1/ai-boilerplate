import { Repository } from 'typeorm'
import { faker } from '@faker-js/faker'
import { MedicalRecordTemplate } from '../entities/medical-record-template.entity'
import { MedicalRecordTemplatesRepository } from './medical-record-templates.repository'

function makeQueryBuilder() {
  return {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  }
}

function makeRepo(): jest.Mocked<Repository<MedicalRecordTemplate>> {
  return {
    createQueryBuilder: jest.fn(),
    findOneBy: jest.fn(),
    findOneByOrFail: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
  } as unknown as jest.Mocked<Repository<MedicalRecordTemplate>>
}

const clinicId = '10000000-0000-4000-8000-000000000000'

function makeTemplate(overrides = {}): MedicalRecordTemplate {
  return {
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
  } as MedicalRecordTemplate
}

describe('MedicalRecordTemplatesRepository', () => {
  let repo: jest.Mocked<Repository<MedicalRecordTemplate>>
  let repository: MedicalRecordTemplatesRepository

  beforeEach(() => {
    jest.clearAllMocks()
    repo = makeRepo()
    repository = new MedicalRecordTemplatesRepository(repo)
  })

  describe('findAll', () => {
    it('scopes by clinic and paginates', async () => {
      const qb = makeQueryBuilder()
      qb.getManyAndCount.mockResolvedValue([[makeTemplate()], 1])
      repo.createQueryBuilder.mockReturnValue(qb as any)

      const result = await repository.findAll(clinicId, 2, 10)

      expect(qb.where).toHaveBeenCalledWith('template.clinicId = :clinicId', { clinicId })
      expect(qb.andWhere).not.toHaveBeenCalled()
      expect(qb.skip).toHaveBeenCalledWith(10)
      expect(qb.take).toHaveBeenCalledWith(10)
      expect(result[1]).toBe(1)
    })

    it('filters by specialtyId when provided', async () => {
      const qb = makeQueryBuilder()
      qb.getManyAndCount.mockResolvedValue([[], 0])
      repo.createQueryBuilder.mockReturnValue(qb as any)

      await repository.findAll(clinicId, 1, 20, 'spec-1')

      expect(qb.andWhere).toHaveBeenCalledWith('template.specialtyId = :specialtyId', {
        specialtyId: 'spec-1',
      })
    })
  })

  describe('findById', () => {
    it('scopes by id and clinicId', async () => {
      const template = makeTemplate()
      repo.findOneBy.mockResolvedValue(template)

      const result = await repository.findById(template.id, clinicId)

      expect(repo.findOneBy).toHaveBeenCalledWith({ id: template.id, clinicId })
      expect(result).toBe(template)
    })
  })

  describe('findByClinicAndSpecialty', () => {
    it('looks up by clinicId and specialtyId', async () => {
      const template = makeTemplate()
      repo.findOneBy.mockResolvedValue(template)

      const result = await repository.findByClinicAndSpecialty(clinicId, 'spec-1')

      expect(repo.findOneBy).toHaveBeenCalledWith({ clinicId, specialtyId: 'spec-1' })
      expect(result).toBe(template)
    })
  })

  describe('create', () => {
    it('creates with the clinicId injected', async () => {
      const template = makeTemplate()
      repo.create.mockReturnValue(template)
      repo.save.mockResolvedValue(template)

      const result = await repository.create({ name: 'Template', specialtyId: 'spec-1' }, clinicId)

      expect(repo.create).toHaveBeenCalledWith({ name: 'Template', specialtyId: 'spec-1', clinicId })
      expect(result).toBe(template)
    })

    it('uses queryRunner repository when provided', async () => {
      const template = makeTemplate()
      const qrRepo = {
        create: jest.fn().mockReturnValue(template),
        save: jest.fn().mockResolvedValue(template),
      }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } }

      const result = await repository.create({ name: 'T' }, clinicId, queryRunner as any)

      expect(queryRunner.manager.getRepository).toHaveBeenCalledWith(MedicalRecordTemplate)
      expect(result).toBe(template)
      expect(repo.create).not.toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('loads scoped template, merges and saves', async () => {
      const template = makeTemplate()
      const mutable = { ...template }
      repo.findOneByOrFail.mockResolvedValue(mutable as any)
      repo.save.mockResolvedValue({ ...mutable, name: 'New' } as any)

      const result = await repository.update(template.id, { name: 'New' }, clinicId)

      expect(repo.findOneByOrFail).toHaveBeenCalledWith({ id: template.id, clinicId })
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ name: 'New' }))
      expect(result.name).toBe('New')
    })

    it('uses queryRunner repository when provided', async () => {
      const template = makeTemplate()
      const qrRepo = {
        findOneByOrFail: jest.fn().mockResolvedValue({ ...template }),
        save: jest.fn().mockResolvedValue(template),
      }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } }

      const result = await repository.update(template.id, { name: 'X' }, clinicId, queryRunner as any)

      expect(queryRunner.manager.getRepository).toHaveBeenCalledWith(MedicalRecordTemplate)
      expect(result).toBe(template)
      expect(repo.findOneByOrFail).not.toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('soft deletes scoped by id and clinicId', async () => {
      repo.softDelete.mockResolvedValue({ affected: 1 } as any)

      await repository.delete('tpl-1', clinicId)

      expect(repo.softDelete).toHaveBeenCalledWith({ id: 'tpl-1', clinicId })
    })

    it('uses queryRunner repository when provided', async () => {
      const qrRepo = { softDelete: jest.fn().mockResolvedValue({ affected: 1 }) }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } }

      await repository.delete('tpl-1', clinicId, queryRunner as any)

      expect(queryRunner.manager.getRepository).toHaveBeenCalledWith(MedicalRecordTemplate)
      expect(qrRepo.softDelete).toHaveBeenCalledWith({ id: 'tpl-1', clinicId })
      expect(repo.softDelete).not.toHaveBeenCalled()
    })
  })
})
