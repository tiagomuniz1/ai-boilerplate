import { Repository } from 'typeorm'
import { PatientGender, UserRole } from '@app/shared'
import { PatientsRepository } from './patients.repository'
import { Patient } from '../entities/patient.entity'

const CLINIC_ID = 'fixed-clinic-uuid'

function makeQueryBuilderMock(overrides: { result?: any; getOne?: any } = {}) {
  return {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue(overrides.result ?? [[], 0]),
    getOne: jest.fn().mockResolvedValue(overrides.getOne ?? null),
  }
}

function makeRepo(): jest.Mocked<Repository<Patient>> {
  return {
    findOneBy: jest.fn(),
    findOneOrFail: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
    createQueryBuilder: jest.fn(),
  } as unknown as jest.Mocked<Repository<Patient>>
}

const makeUser = (overrides = {}) => ({
  id: 'user-uuid-1',
  fullName: 'Alice Costa',
  email: 'alice@example.com',
  password: 'hashed',
  role: UserRole.PATIENT,
  isActive: false,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

const makePatient = (overrides = {}): Patient => {
  const user = makeUser()
  return {
    id: 'uuid-1',
    user,
    userId: user.id,
    documentNumber: '12345678901',
    phoneNumber: '(11) 99999-9999',
    birthDate: '1990-05-15',
    gender: PatientGender.FEMALE,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as Patient
}

describe('PatientsRepository', () => {
  let repo: jest.Mocked<Repository<Patient>>
  let repository: PatientsRepository

  beforeEach(() => {
    jest.clearAllMocks()
    repo = makeRepo()
    repository = new PatientsRepository(repo)
  })

  describe('findAll', () => {
    it('uses QueryBuilder with clinicId where clause and no andWhere when no search', async () => {
      const patients = [makePatient()]
      const qb = makeQueryBuilderMock({ result: [patients, 1] })
      repo.createQueryBuilder.mockReturnValue(qb as any)

      const result = await repository.findAll(2, 10, CLINIC_ID)

      expect(repo.createQueryBuilder).toHaveBeenCalledWith('patient')
      expect(qb.innerJoinAndSelect).toHaveBeenCalledWith('patient.user', 'user')
      expect(qb.where).toHaveBeenCalledWith('user.clinicId = :clinicId', { clinicId: CLINIC_ID })
      expect(qb.skip).toHaveBeenCalledWith(10)
      expect(qb.take).toHaveBeenCalledWith(10)
      expect(qb.andWhere).not.toHaveBeenCalled()
      expect(result).toEqual([patients, 1])
    })

    it('adds andWhere with search when search is provided', async () => {
      const qb = makeQueryBuilderMock({ result: [[], 0] })
      repo.createQueryBuilder.mockReturnValue(qb as any)

      await repository.findAll(1, 20, CLINIC_ID, 'alice')

      expect(qb.where).toHaveBeenCalledWith('user.clinicId = :clinicId', { clinicId: CLINIC_ID })
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(user.full_name ILIKE :search OR patient.document_number = :exactSearch)',
        { search: '%alice%', exactSearch: 'alice' },
      )
    })

    it('calculates correct skip for pagination', async () => {
      const qb = makeQueryBuilderMock({ result: [[], 0] })
      repo.createQueryBuilder.mockReturnValue(qb as any)

      await repository.findAll(3, 10, CLINIC_ID)

      expect(qb.skip).toHaveBeenCalledWith(20)
      expect(qb.take).toHaveBeenCalledWith(10)
    })
  })

  describe('findById', () => {
    it('uses QueryBuilder with id and clinicId filters when found', async () => {
      const patient = makePatient()
      const qb = makeQueryBuilderMock({ getOne: patient })
      repo.createQueryBuilder.mockReturnValue(qb as any)

      const result = await repository.findById('uuid-1', CLINIC_ID)

      expect(repo.createQueryBuilder).toHaveBeenCalledWith('patient')
      expect(qb.innerJoinAndSelect).toHaveBeenCalledWith('patient.user', 'user')
      expect(qb.where).toHaveBeenCalledWith('patient.id = :id', { id: 'uuid-1' })
      expect(qb.andWhere).toHaveBeenCalledWith('user.clinicId = :clinicId', { clinicId: CLINIC_ID })
      expect(result).toBe(patient)
    })

    it('returns null when not found', async () => {
      const qb = makeQueryBuilderMock({ getOne: null })
      repo.createQueryBuilder.mockReturnValue(qb as any)

      expect(await repository.findById('missing', CLINIC_ID)).toBeNull()
    })
  })

  describe('findByUserId', () => {
    it('returns patient when found', async () => {
      const patient = makePatient()
      repo.findOneBy.mockResolvedValue(patient)

      const result = await repository.findByUserId('user-uuid-1')

      expect(repo.findOneBy).toHaveBeenCalledWith({ userId: 'user-uuid-1' })
      expect(result).toBe(patient)
    })

    it('returns null when not found', async () => {
      repo.findOneBy.mockResolvedValue(null)

      expect(await repository.findByUserId('missing')).toBeNull()
    })
  })

  describe('findByDocumentNumber', () => {
    it('uses QueryBuilder with documentNumber and clinicId filters', async () => {
      const patient = makePatient()
      const qb = makeQueryBuilderMock({ getOne: patient })
      repo.createQueryBuilder.mockReturnValue(qb as any)

      const result = await repository.findByDocumentNumber('12345678901', CLINIC_ID)

      expect(repo.createQueryBuilder).toHaveBeenCalledWith('patient')
      expect(qb.where).toHaveBeenCalledWith('patient.document_number = :documentNumber', { documentNumber: '12345678901' })
      expect(qb.andWhere).toHaveBeenCalledWith('user.clinicId = :clinicId', { clinicId: CLINIC_ID })
      expect(result).toBe(patient)
    })

    it('returns null when not found', async () => {
      const qb = makeQueryBuilderMock({ getOne: null })
      repo.createQueryBuilder.mockReturnValue(qb as any)

      expect(await repository.findByDocumentNumber('00000000000', CLINIC_ID)).toBeNull()
    })
  })

  describe('create', () => {
    it('saves patient and reloads with user relation', async () => {
      const data = {
        userId: 'user-uuid-1',
        documentNumber: '12345678901',
        phoneNumber: '(11) 99999-9999',
        birthDate: '1990-05-15',
        gender: PatientGender.FEMALE,
      }
      const saved = makePatient()
      const withRelation = makePatient()
      repo.create.mockReturnValue(saved)
      repo.save.mockResolvedValue(saved)
      repo.findOneOrFail.mockResolvedValue(withRelation)

      const result = await repository.create(data)

      expect(repo.create).toHaveBeenCalledWith(data)
      expect(repo.save).toHaveBeenCalledWith(saved)
      expect(repo.findOneOrFail).toHaveBeenCalledWith({
        where: { id: saved.id },
        relations: ['user'],
      })
      expect(result).toBe(withRelation)
    })

    it('uses queryRunner repository when provided', async () => {
      const qrRepo = makeRepo()
      const saved = makePatient()
      const withRelation = makePatient()
      qrRepo.create.mockReturnValue(saved)
      qrRepo.save.mockResolvedValue(saved)
      qrRepo.findOneOrFail.mockResolvedValue(withRelation)
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as any

      await repository.create({ userId: 'user-uuid-1' } as any, queryRunner)

      expect(qrRepo.save).toHaveBeenCalled()
      expect(qrRepo.findOneOrFail).toHaveBeenCalled()
      expect(repo.save).not.toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('loads patient with user relation, merges data, and saves', async () => {
      const patient = makePatient()
      const updated = makePatient({ phoneNumber: '(11) 88888-8888' })
      repo.findOneOrFail.mockResolvedValue(patient)
      repo.save.mockResolvedValue(updated)

      const result = await repository.update('uuid-1', { phoneNumber: '(11) 88888-8888' })

      expect(repo.findOneOrFail).toHaveBeenCalledWith({ where: { id: 'uuid-1' }, relations: ['user'] })
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ phoneNumber: '(11) 88888-8888' }))
      expect(result).toBe(updated)
    })

    it('uses queryRunner repository when provided', async () => {
      const qrRepo = makeRepo()
      const patient = makePatient()
      qrRepo.findOneOrFail.mockResolvedValue(patient)
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
