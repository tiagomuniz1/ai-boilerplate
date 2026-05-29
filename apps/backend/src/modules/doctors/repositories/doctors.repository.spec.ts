import { Repository } from 'typeorm'
import { DoctorsRepository } from './doctors.repository'
import { Doctor } from '../entities/doctor.entity'
import { User } from '../../users/entities/user.entity'

function makeQueryBuilderMock(result: [Doctor[], number]) {
  const qb: any = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue(result),
  }
  return qb
}

function makeManagerRepo() {
  return {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
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
    softDelete: jest.fn(),
    createQueryBuilder: jest.fn(),
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
    specialties: [{ id: 'spec-uuid-1', name: 'Cardiologia' }],
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
    it('returns paginated results without search using findAndCount with relations', async () => {
      const doctors = [makeDoctor()]
      repo.findAndCount.mockResolvedValue([doctors, 1])

      const result = await repository.findAll(2, 10)

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: ['user', 'specialties'],
          skip: 10,
          take: 10,
          order: { createdAt: 'DESC' },
        }),
      )
      expect(result).toEqual([doctors, 1])
    })

    it('uses QueryBuilder with ILIKE on fullName and specialty name when search is provided', async () => {
      const doctors = [makeDoctor()]
      const qb = makeQueryBuilderMock([doctors, 1])
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await repository.findAll(1, 20, 'Cardio')

      expect(repo.createQueryBuilder).toHaveBeenCalledWith('doctor')
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('doctor.user', 'user')
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('doctor.specialties', 'specialty')
      expect(qb.where).toHaveBeenCalledWith('user.fullName ILIKE :search', { search: '%Cardio%' })
      expect(qb.orWhere).toHaveBeenCalledWith('specialty.name ILIKE :search', { search: '%Cardio%' })
      expect(qb.getManyAndCount).toHaveBeenCalled()
      expect(result).toEqual([doctors, 1])
    })

    it('does not use createQueryBuilder when search is undefined', async () => {
      repo.findAndCount.mockResolvedValue([[], 0])

      await repository.findAll(1, 20, undefined)

      expect(repo.createQueryBuilder).not.toHaveBeenCalled()
      expect(repo.findAndCount).toHaveBeenCalled()
    })

    it('calculates correct skip for pagination', async () => {
      repo.findAndCount.mockResolvedValue([[], 0])

      await repository.findAll(3, 10)

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      )
    })
  })

  describe('findById', () => {
    it('returns doctor with user and specialties relations when found', async () => {
      const doctor = makeDoctor()
      repo.findOne.mockResolvedValue(doctor)

      const result = await repository.findById('uuid-1')

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
        relations: ['user', 'specialties'],
      })
      expect(result).toBe(doctor)
    })

    it('returns null when not found', async () => {
      repo.findOne.mockResolvedValue(null)

      expect(await repository.findById('missing')).toBeNull()
    })
  })

  describe('findByUserId', () => {
    it('returns doctor with user and specialties relations when found', async () => {
      const doctor = makeDoctor()
      repo.findOne.mockResolvedValue(doctor)

      const result = await repository.findByUserId('user-uuid-1')

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1' },
        relations: ['user', 'specialties'],
      })
      expect(result).toBe(doctor)
    })

    it('returns null when not found', async () => {
      repo.findOne.mockResolvedValue(null)

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
    it('creates doctor with specialties, saves, and reloads with all relations', async () => {
      const data = { userId: 'user-uuid-1', crmNumber: '12345/SP', bio: null }
      const specialties = [{ id: 'spec-uuid-1', name: 'Cardiologia' }] as any
      const entity = { id: 'uuid-1', ...data, specialties: [] } as unknown as Doctor
      const withRelations = makeDoctor()

      const managerRepo = (repo.manager as any)._managerRepo
      managerRepo.create.mockReturnValue(entity)
      managerRepo.save.mockResolvedValue(entity)
      repo.findOne.mockResolvedValue(withRelations)

      const result = await repository.create(data as any, specialties)

      expect(managerRepo.create).toHaveBeenCalledWith({
        userId: data.userId,
        crmNumber: data.crmNumber,
        bio: data.bio,
      })
      expect(entity.specialties).toBe(specialties)
      expect(managerRepo.save).toHaveBeenCalledWith(entity)
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: entity.id },
        relations: ['user', 'specialties'],
      })
      expect(result).toBe(withRelations)
    })

    it('uses queryRunner manager repo when provided', async () => {
      const data = { userId: 'user-uuid-1', crmNumber: '12345/SP', bio: null }
      const specialties = [] as any
      const entity = { id: 'uuid-qr', specialties: [] } as unknown as Doctor
      const withRelations = makeDoctor({ id: 'uuid-qr' })

      const qrRepo = makeManagerRepo()
      qrRepo.create.mockReturnValue(entity)
      qrRepo.save.mockResolvedValue(entity)
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as any
      repo.findOne.mockResolvedValue(withRelations)

      const result = await repository.create(data as any, specialties, queryRunner)

      expect(qrRepo.save).toHaveBeenCalled()
      expect((repo.manager as any)._managerRepo.save).not.toHaveBeenCalled()
      expect(result).toBe(withRelations)
    })
  })

  describe('update', () => {
    it('loads doctor with specialties, merges data, saves, and reloads with relations', async () => {
      const doctor = makeDoctor()
      const newSpecialties = [{ id: 'spec-uuid-2', name: 'Neurologia' }] as any
      const updated = makeDoctor({ specialties: newSpecialties })

      const managerRepo = (repo.manager as any)._managerRepo
      managerRepo.findOne.mockResolvedValue(doctor)
      managerRepo.save.mockResolvedValue({ ...doctor, specialties: newSpecialties })
      repo.findOne.mockResolvedValue(updated)

      const result = await repository.update('uuid-1', { crmNumber: '99999/SP' }, newSpecialties)

      expect(managerRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
        relations: ['specialties'],
      })
      expect(managerRepo.save).toHaveBeenCalled()
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
        relations: ['user', 'specialties'],
      })
      expect(result).toBe(updated)
    })

    it('does not modify specialties when null is passed', async () => {
      const doctor = makeDoctor()
      const originalSpecialties = doctor.specialties
      const updated = makeDoctor({ id: doctor.id })

      const managerRepo = (repo.manager as any)._managerRepo
      managerRepo.findOne.mockResolvedValue(doctor)
      managerRepo.save.mockResolvedValue(doctor)
      repo.findOne.mockResolvedValue(updated)

      await repository.update('uuid-1', { crmNumber: '99999/SP' }, null)

      expect(doctor.specialties).toBe(originalSpecialties)
    })

    it('throws when doctor is not found', async () => {
      const managerRepo = (repo.manager as any)._managerRepo
      managerRepo.findOne.mockResolvedValue(null)

      await expect(repository.update('missing', {}, null)).rejects.toThrow('Doctor missing not found')
    })

    it('uses queryRunner repository when provided', async () => {
      const doctor = makeDoctor()
      const withRelations = makeDoctor()

      const qrRepo = makeManagerRepo()
      qrRepo.findOne.mockResolvedValue(doctor)
      qrRepo.save.mockResolvedValue(doctor)
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as any
      repo.findOne.mockResolvedValue(withRelations)

      await repository.update('uuid-1', { bio: 'new bio' }, null, queryRunner)

      expect(qrRepo.findOne).toHaveBeenCalled()
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
