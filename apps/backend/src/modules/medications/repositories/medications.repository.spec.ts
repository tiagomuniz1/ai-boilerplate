import { Repository } from 'typeorm'
import { faker } from '@faker-js/faker'
import { MedicationSource } from '@app/shared'
import { Medication } from '../entities/medication.entity'
import { MedicationsRepository } from './medications.repository'
import { CreateMedicationData } from './medications.repository.interface'

function makeSelectQueryBuilder() {
  return {
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  }
}

function makeInsertQueryBuilder() {
  return {
    insert: jest.fn().mockReturnThis(),
    into: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    orUpdate: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue(undefined),
  }
}

function makeRepo(): jest.Mocked<Repository<Medication>> {
  return {
    createQueryBuilder: jest.fn(),
    findOneBy: jest.fn(),
    findOneByOrFail: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
    manager: { query: jest.fn().mockResolvedValue(undefined) },
    metadata: { schema: 'test' },
  } as unknown as jest.Mocked<Repository<Medication>>
}

function makeMedication(overrides = {}): Medication {
  return {
    id: faker.string.uuid(),
    name: 'Dipirona',
    activeIngredient: 'dipirona sódica',
    regulatoryCategory: 'Genérico',
    therapeuticClass: 'ANALGESICOS',
    holderCompany: 'ACME',
    registrationNumber: '123456789',
    registrationStatus: 'Ativo',
    source: MedicationSource.ANVISA,
    importHash: 'hash',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as Medication
}

function makeUpsertRow(overrides: Partial<CreateMedicationData> = {}): CreateMedicationData {
  return {
    name: 'Dipirona',
    activeIngredient: 'dipirona sódica',
    regulatoryCategory: 'Genérico',
    therapeuticClass: 'ANALGESICOS',
    holderCompany: 'ACME',
    registrationNumber: '123456789',
    registrationStatus: 'Ativo',
    source: MedicationSource.ANVISA,
    importHash: 'hash',
    isActive: true,
    ...overrides,
  }
}

describe('MedicationsRepository', () => {
  let repo: jest.Mocked<Repository<Medication>>
  let repository: MedicationsRepository

  beforeEach(() => {
    jest.clearAllMocks()
    repo = makeRepo()
    repository = new MedicationsRepository(repo)
  })

  describe('findAll', () => {
    it('filters by is_active and paginates ordered by name when active only and no search', async () => {
      const qb = makeSelectQueryBuilder()
      const rows: [Medication[], number] = [[makeMedication()], 1]
      qb.getManyAndCount.mockResolvedValue(rows)
      repo.createQueryBuilder.mockReturnValue(qb as any)

      const result = await repository.findAll(2, 20, undefined, false)

      expect(qb.andWhere).toHaveBeenCalledWith('medication.is_active = :isActive', { isActive: true })
      expect(qb.andWhere).toHaveBeenCalledTimes(1)
      expect(qb.orderBy).toHaveBeenCalledWith('medication.name', 'ASC')
      expect(qb.skip).toHaveBeenCalledWith(20)
      expect(qb.take).toHaveBeenCalledWith(20)
      expect(result).toBe(rows)
    })

    it('does not filter by is_active when includeInactive is true', async () => {
      const qb = makeSelectQueryBuilder()
      qb.getManyAndCount.mockResolvedValue([[], 0])
      repo.createQueryBuilder.mockReturnValue(qb as any)

      await repository.findAll(1, 20, undefined, true)

      expect(qb.andWhere).not.toHaveBeenCalledWith('medication.is_active = :isActive', { isActive: true })
    })

    it('applies an ILIKE search over name and active_ingredient', async () => {
      const qb = makeSelectQueryBuilder()
      qb.getManyAndCount.mockResolvedValue([[], 0])
      repo.createQueryBuilder.mockReturnValue(qb as any)

      await repository.findAll(1, 10, '  dipi  ', false)

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(medication.name ILIKE :term OR medication.active_ingredient ILIKE :term)',
        { term: '%dipi%' },
      )
    })

    it('ignores a blank search term', async () => {
      const qb = makeSelectQueryBuilder()
      qb.getManyAndCount.mockResolvedValue([[], 0])
      repo.createQueryBuilder.mockReturnValue(qb as any)

      await repository.findAll(1, 10, '   ', false)

      expect(qb.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.anything(),
      )
    })
  })

  describe('findById', () => {
    it('returns the medication when found', async () => {
      const medication = makeMedication()
      repo.findOneBy.mockResolvedValue(medication)

      const result = await repository.findById(medication.id)

      expect(repo.findOneBy).toHaveBeenCalledWith({ id: medication.id })
      expect(result).toBe(medication)
    })

    it('returns null when not found', async () => {
      repo.findOneBy.mockResolvedValue(null)

      const result = await repository.findById(faker.string.uuid())

      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('creates and saves a medication', async () => {
      const medication = makeMedication()
      repo.create.mockReturnValue(medication)
      repo.save.mockResolvedValue(medication)

      const data = makeUpsertRow()
      const result = await repository.create(data)

      expect(repo.create).toHaveBeenCalledWith(data)
      expect(repo.save).toHaveBeenCalledWith(medication)
      expect(result).toBe(medication)
    })

    it('uses the queryRunner repository when provided', async () => {
      const medication = makeMedication()
      const qrRepo = {
        create: jest.fn().mockReturnValue(medication),
        save: jest.fn().mockResolvedValue(medication),
      }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } }

      const result = await repository.create(makeUpsertRow(), queryRunner as any)

      expect(queryRunner.manager.getRepository).toHaveBeenCalledWith(Medication)
      expect(result).toBe(medication)
      expect(repo.create).not.toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('loads the medication, merges data and saves', async () => {
      const medication = makeMedication()
      repo.findOneByOrFail.mockResolvedValue({ ...medication } as any)
      repo.save.mockResolvedValue({ ...medication, name: 'Novo' } as any)

      const result = await repository.update(medication.id, { name: 'Novo' })

      expect(repo.findOneByOrFail).toHaveBeenCalledWith({ id: medication.id })
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ name: 'Novo' }))
      expect(result.name).toBe('Novo')
    })

    it('uses the queryRunner repository when provided', async () => {
      const medication = makeMedication()
      const qrRepo = {
        findOneByOrFail: jest.fn().mockResolvedValue({ ...medication }),
        save: jest.fn().mockResolvedValue(medication),
      }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } }

      const result = await repository.update(medication.id, { isActive: false }, queryRunner as any)

      expect(queryRunner.manager.getRepository).toHaveBeenCalledWith(Medication)
      expect(result).toBe(medication)
      expect(repo.findOneByOrFail).not.toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('soft deletes the medication', async () => {
      const id = faker.string.uuid()
      await repository.delete(id)
      expect(repo.softDelete).toHaveBeenCalledWith(id)
    })

    it('uses the queryRunner repository when provided', async () => {
      const id = faker.string.uuid()
      const qrRepo = { softDelete: jest.fn().mockResolvedValue(undefined) }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } }

      await repository.delete(id, queryRunner as any)

      expect(queryRunner.manager.getRepository).toHaveBeenCalledWith(Medication)
      expect(qrRepo.softDelete).toHaveBeenCalledWith(id)
      expect(repo.softDelete).not.toHaveBeenCalled()
    })
  })

  describe('bulkUpsert', () => {
    it('does nothing for an empty array', async () => {
      await repository.bulkUpsert([])
      expect(repo.createQueryBuilder).not.toHaveBeenCalled()
    })

    it('inserts with ON CONFLICT on import_hash using the partial index predicate', async () => {
      const qb = makeInsertQueryBuilder()
      repo.createQueryBuilder.mockReturnValue(qb as any)
      const rows = [makeUpsertRow(), makeUpsertRow({ importHash: 'other' })]

      await repository.bulkUpsert(rows)

      expect(qb.into).toHaveBeenCalledWith(Medication)
      expect(qb.values).toHaveBeenCalledWith(rows)
      expect(qb.orUpdate).toHaveBeenCalledWith(
        expect.arrayContaining(['name', 'active_ingredient', 'is_active', 'updated_at']),
        ['import_hash'],
        { indexPredicate: 'import_hash IS NOT NULL' },
      )
      expect(qb.execute).toHaveBeenCalled()
    })

    it('uses the queryRunner repository when provided', async () => {
      const qb = makeInsertQueryBuilder()
      const qrRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb) }
      const queryRunner = {
        manager: { getRepository: jest.fn().mockReturnValue(qrRepo) },
      }

      await repository.bulkUpsert([makeUpsertRow()], queryRunner as any)

      expect(queryRunner.manager.getRepository).toHaveBeenCalledWith(Medication)
      expect(qb.execute).toHaveBeenCalled()
      expect(repo.createQueryBuilder).not.toHaveBeenCalled()
    })
  })
})
