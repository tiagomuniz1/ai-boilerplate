import { Repository } from 'typeorm'
import { PatientGender } from '@app/shared'
import { PatientsRepository } from './patients.repository'
import { Patient } from '../entities/patient.entity'

function makeQueryBuilder() {
  return {
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  }
}

function makeRepo(): jest.Mocked<Repository<Patient>> {
  return {
    findOneBy: jest.fn(),
    findOneByOrFail: jest.fn(),
    createQueryBuilder: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
  } as unknown as jest.Mocked<Repository<Patient>>
}

const makePatient = (overrides = {}): Patient => ({
  id: 'uuid-1',
  fullName: 'Alice Costa',
  documentNumber: '12345678901',
  email: 'alice@example.com',
  phoneNumber: '(11) 99999-9999',
  birthDate: '1990-05-15',
  gender: PatientGender.FEMALE,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
} as Patient)

describe('PatientsRepository', () => {
  let repo: jest.Mocked<Repository<Patient>>
  let repository: PatientsRepository

  beforeEach(() => {
    jest.clearAllMocks()
    repo = makeRepo()
    repository = new PatientsRepository(repo)
  })

  describe('findAll', () => {
    let mockQb: ReturnType<typeof makeQueryBuilder>

    beforeEach(() => {
      mockQb = makeQueryBuilder()
      ;(repo.createQueryBuilder as jest.Mock).mockReturnValue(mockQb)
    })

    it('returns paginated results without search', async () => {
      const patients = [makePatient()]
      mockQb.getManyAndCount.mockResolvedValue([patients, 1])

      const result = await repository.findAll(2, 10)

      expect(repo.createQueryBuilder).toHaveBeenCalledWith('patient')
      expect(mockQb.skip).toHaveBeenCalledWith(10)
      expect(mockQb.take).toHaveBeenCalledWith(10)
      expect(mockQb.orderBy).toHaveBeenCalledWith('patient.created_at', 'DESC')
      expect(mockQb.andWhere).not.toHaveBeenCalled()
      expect(result).toEqual([patients, 1])
    })

    it('applies ILIKE filter on full_name and exact match on document_number when search is provided', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0])

      await repository.findAll(1, 20, 'alice')

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        '(patient.full_name ILIKE :search OR patient.document_number = :exact)',
        { search: '%alice%', exact: 'alice' },
      )
    })

    it('does not apply filter when search is undefined', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0])

      await repository.findAll(1, 20, undefined)

      expect(mockQb.andWhere).not.toHaveBeenCalled()
    })
  })

  describe('findById', () => {
    it('returns patient when found', async () => {
      const patient = makePatient()
      repo.findOneBy.mockResolvedValue(patient)

      const result = await repository.findById('uuid-1')

      expect(repo.findOneBy).toHaveBeenCalledWith({ id: 'uuid-1' })
      expect(result).toBe(patient)
    })

    it('returns null when not found', async () => {
      repo.findOneBy.mockResolvedValue(null)

      expect(await repository.findById('missing')).toBeNull()
    })
  })

  describe('findByDocumentNumber', () => {
    it('returns patient when found', async () => {
      const patient = makePatient()
      repo.findOneBy.mockResolvedValue(patient)

      const result = await repository.findByDocumentNumber('12345678901')

      expect(repo.findOneBy).toHaveBeenCalledWith({ documentNumber: '12345678901' })
      expect(result).toBe(patient)
    })

    it('returns null when not found', async () => {
      repo.findOneBy.mockResolvedValue(null)

      expect(await repository.findByDocumentNumber('00000000000')).toBeNull()
    })
  })

  describe('create', () => {
    it('creates and saves patient using default repository', async () => {
      const data = {
        fullName: 'Alice Costa',
        documentNumber: '12345678901',
        email: 'alice@example.com',
        phoneNumber: '(11) 99999-9999',
        birthDate: '1990-05-15',
        gender: PatientGender.FEMALE,
      }
      const entity = { ...data } as Patient
      repo.create.mockReturnValue(entity)
      repo.save.mockResolvedValue(entity)

      const result = await repository.create(data as any)

      expect(repo.create).toHaveBeenCalledWith(data)
      expect(repo.save).toHaveBeenCalledWith(entity)
      expect(result).toBe(entity)
    })

    it('uses queryRunner repository when provided', async () => {
      const qrRepo = makeRepo()
      const entity = makePatient()
      qrRepo.create.mockReturnValue(entity)
      qrRepo.save.mockResolvedValue(entity)
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as any

      await repository.create({ fullName: 'Bob' } as any, queryRunner)

      expect(qrRepo.save).toHaveBeenCalled()
      expect(repo.save).not.toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('loads patient, merges data, and saves', async () => {
      const patient = makePatient()
      const updated = makePatient({ fullName: 'Alice Updated' })
      repo.findOneByOrFail.mockResolvedValue(patient)
      repo.save.mockResolvedValue(updated)

      const result = await repository.update('uuid-1', { fullName: 'Alice Updated' })

      expect(repo.findOneByOrFail).toHaveBeenCalledWith({ id: 'uuid-1' })
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ fullName: 'Alice Updated' }))
      expect(result).toBe(updated)
    })

    it('uses queryRunner repository when provided', async () => {
      const qrRepo = makeRepo()
      const patient = makePatient()
      qrRepo.findOneByOrFail.mockResolvedValue(patient)
      qrRepo.save.mockResolvedValue(patient)
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as any

      await repository.update('uuid-1', {}, queryRunner)

      expect(qrRepo.save).toHaveBeenCalled()
      expect(repo.save).not.toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('soft deletes the patient', async () => {
      repo.softDelete.mockResolvedValue({ affected: 1 } as any)

      await repository.delete('uuid-1')

      expect(repo.softDelete).toHaveBeenCalledWith('uuid-1')
    })

    it('uses queryRunner repository when provided', async () => {
      const qrRepo = makeRepo()
      qrRepo.softDelete.mockResolvedValue({ affected: 1 } as any)
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as any

      await repository.delete('uuid-1', queryRunner)

      expect(qrRepo.softDelete).toHaveBeenCalledWith('uuid-1')
      expect(repo.softDelete).not.toHaveBeenCalled()
    })
  })
})
