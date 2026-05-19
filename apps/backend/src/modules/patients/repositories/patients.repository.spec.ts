import { ILike, Repository } from 'typeorm'
import { PatientGender, UserRole } from '@app/shared'
import { PatientsRepository } from './patients.repository'
import { Patient } from '../entities/patient.entity'

function makeRepo(): jest.Mocked<Repository<Patient>> {
  return {
    findOneBy: jest.fn(),
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
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
    it('returns paginated results without search', async () => {
      const patients = [makePatient()]
      repo.findAndCount.mockResolvedValue([patients, 1])

      const result = await repository.findAll(2, 10)

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: ['user'],
          where: {},
          skip: 10,
          take: 10,
          order: { createdAt: 'DESC' },
        }),
      )
      expect(result).toEqual([patients, 1])
    })

    it('filters by fullName ILIKE and documentNumber exact match when search is provided', async () => {
      repo.findAndCount.mockResolvedValue([[], 0])

      await repository.findAll(1, 20, 'alice')

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [
            { user: { fullName: ILike('%alice%') } },
            { documentNumber: 'alice' },
          ],
        }),
      )
    })

    it('uses empty where when search is undefined', async () => {
      repo.findAndCount.mockResolvedValue([[], 0])

      await repository.findAll(1, 20, undefined)

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      )
    })
  })

  describe('findById', () => {
    it('returns patient with user relation when found', async () => {
      const patient = makePatient()
      repo.findOne.mockResolvedValue(patient)

      const result = await repository.findById('uuid-1')

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'uuid-1' }, relations: ['user'] })
      expect(result).toBe(patient)
    })

    it('returns null when not found', async () => {
      repo.findOne.mockResolvedValue(null)

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
