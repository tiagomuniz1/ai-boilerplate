import { ILike, Repository } from 'typeorm'
import { DoctorsRepository } from './doctors.repository'
import { Doctor } from '../entities/doctor.entity'
import { User } from '../../users/entities/user.entity'

function makeManagerRepo() {
  return {
    create: jest.fn(),
    save: jest.fn(),
    findOneByOrFail: jest.fn(),
    softDelete: jest.fn(),
  }
}

function makeRepo(): jest.Mocked<Repository<Doctor>> {
  const managerRepo = makeManagerRepo()
  const manager = {
    getRepository: jest.fn().mockReturnValue(managerRepo),
    _managerRepo: managerRepo,
  }
  return {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    findOneByOrFail: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
    manager,
  } as unknown as jest.Mocked<Repository<Doctor>>
}

function makeUser(): User {
  return {
    id: 'user-uuid-1',
    fullName: 'Dr. Alice',
    email: 'alice@clinic.com',
  } as User
}

function makeDoctor(overrides = {}): Doctor {
  return {
    id: 'uuid-1',
    userId: 'user-uuid-1',
    user: makeUser(),
    crmNumber: '12345/SP',
    specialty: 'Cardiologia',
    bio: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as Doctor
}

describe('DoctorsRepository', () => {
  let repo: jest.Mocked<Repository<Doctor>>
  let repository: DoctorsRepository

  beforeEach(() => {
    jest.clearAllMocks()
    repo = makeRepo()
    repository = new DoctorsRepository(repo)
  })

  describe('findAll', () => {
    it('returns paginated results without search', async () => {
      const doctors = [makeDoctor()]
      repo.findAndCount.mockResolvedValue([doctors, 1])

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
      expect(result).toEqual([doctors, 1])
    })

    it('applies ILike filter on user fullName and specialty when search is provided', async () => {
      repo.findAndCount.mockResolvedValue([[], 0])

      await repository.findAll(1, 20, 'Cardio')

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [
            { user: { fullName: ILike('%Cardio%') } },
            { specialty: ILike('%Cardio%') },
          ],
        }),
      )
    })

    it('does not apply filter when search is undefined', async () => {
      repo.findAndCount.mockResolvedValue([[], 0])

      await repository.findAll(1, 20, undefined)

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      )
    })
  })

  describe('findById', () => {
    it('returns doctor with user relation when found', async () => {
      const doctor = makeDoctor()
      repo.findOne.mockResolvedValue(doctor)

      const result = await repository.findById('uuid-1')

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
        relations: ['user'],
      })
      expect(result).toBe(doctor)
    })

    it('returns null when not found', async () => {
      repo.findOne.mockResolvedValue(null)

      expect(await repository.findById('missing')).toBeNull()
    })
  })

  describe('findByUserId', () => {
    it('returns doctor when found', async () => {
      const doctor = makeDoctor()
      repo.findOneBy.mockResolvedValue(doctor)

      const result = await repository.findByUserId('user-uuid-1')

      expect(repo.findOneBy).toHaveBeenCalledWith({ userId: 'user-uuid-1' })
      expect(result).toBe(doctor)
    })

    it('returns null when not found', async () => {
      repo.findOneBy.mockResolvedValue(null)

      expect(await repository.findByUserId('missing')).toBeNull()
    })
  })

  describe('findByCrmNumber', () => {
    it('returns doctor when found', async () => {
      const doctor = makeDoctor()
      repo.findOneBy.mockResolvedValue(doctor)

      const result = await repository.findByCrmNumber('12345/SP')

      expect(repo.findOneBy).toHaveBeenCalledWith({ crmNumber: '12345/SP' })
      expect(result).toBe(doctor)
    })

    it('returns null when not found', async () => {
      repo.findOneBy.mockResolvedValue(null)

      expect(await repository.findByCrmNumber('99999/RJ')).toBeNull()
    })
  })

  describe('create', () => {
    it('creates and saves doctor using manager repo and reloads with user relation', async () => {
      const data = {
        userId: 'user-uuid-1',
        crmNumber: '12345/SP',
        specialty: 'Cardiologia',
      }
      const entity = { id: 'uuid-1', ...data } as Doctor
      const withUser = makeDoctor()

      const managerRepo = (repo.manager as any)._managerRepo
      managerRepo.create.mockReturnValue(entity)
      managerRepo.save.mockResolvedValue(entity)
      repo.findOne.mockResolvedValue(withUser)

      const result = await repository.create(data as any)

      expect(managerRepo.create).toHaveBeenCalledWith(data)
      expect(managerRepo.save).toHaveBeenCalledWith(entity)
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: entity.id },
        relations: ['user'],
      })
      expect(result).toBe(withUser)
    })

    it('uses queryRunner manager repo when provided', async () => {
      const data = { userId: 'user-uuid-1', crmNumber: '12345/SP', specialty: 'Cardiologia' }
      const entity = { id: 'uuid-qr' } as Doctor
      const withUser = makeDoctor({ id: 'uuid-qr' })

      const qrRepo = makeManagerRepo()
      qrRepo.create.mockReturnValue(entity)
      qrRepo.save.mockResolvedValue(entity)
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as any
      repo.findOne.mockResolvedValue(withUser)

      const result = await repository.create(data as any, queryRunner)

      expect(qrRepo.save).toHaveBeenCalled()
      expect((repo.manager as any)._managerRepo.save).not.toHaveBeenCalled()
      expect(result).toBe(withUser)
    })
  })

  describe('update', () => {
    it('loads doctor, merges data, saves, and reloads with user relation', async () => {
      const doctor = makeDoctor()
      const updated = makeDoctor({ specialty: 'Neurologia' })

      const managerRepo = (repo.manager as any)._managerRepo
      managerRepo.findOneByOrFail.mockResolvedValue(doctor)
      managerRepo.save.mockResolvedValue({ ...doctor, specialty: 'Neurologia' })
      repo.findOne.mockResolvedValue(updated)

      const result = await repository.update('uuid-1', { specialty: 'Neurologia' })

      expect(managerRepo.findOneByOrFail).toHaveBeenCalledWith({ id: 'uuid-1' })
      expect(managerRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ specialty: 'Neurologia' }),
      )
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
        relations: ['user'],
      })
      expect(result).toBe(updated)
    })

    it('uses queryRunner repository when provided', async () => {
      const doctor = makeDoctor()
      const withUser = makeDoctor({ specialty: 'Neurologia' })

      const qrRepo = makeManagerRepo()
      qrRepo.findOneByOrFail.mockResolvedValue(doctor)
      qrRepo.save.mockResolvedValue({ ...doctor, specialty: 'Neurologia' })
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as any
      repo.findOne.mockResolvedValue(withUser)

      await repository.update('uuid-1', { specialty: 'Neurologia' }, queryRunner)

      expect(qrRepo.findOneByOrFail).toHaveBeenCalled()
      expect(qrRepo.save).toHaveBeenCalled()
      expect((repo.manager as any)._managerRepo.save).not.toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('soft deletes the doctor', async () => {
      repo.softDelete.mockResolvedValue({ affected: 1 } as any)

      await repository.delete('uuid-1')

      expect(repo.softDelete).toHaveBeenCalledWith('uuid-1')
    })

    it('uses queryRunner repository when provided', async () => {
      const qrRepo = makeManagerRepo()
      qrRepo.softDelete = jest.fn().mockResolvedValue({ affected: 1 })
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as any

      await repository.delete('uuid-1', queryRunner)

      expect(qrRepo.softDelete).toHaveBeenCalledWith('uuid-1')
      expect(repo.softDelete).not.toHaveBeenCalled()
    })
  })
})
