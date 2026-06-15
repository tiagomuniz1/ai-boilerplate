import { Repository } from 'typeorm'
import { DoctorsRepository } from './doctors.repository'
import { Doctor } from '../entities/doctor.entity'
import { User } from '../../users/entities/user.entity'

const CLINIC_ID = 'fixed-clinic-uuid'

function makeQueryBuilderMock(overrides: { result?: any; getOne?: any } = {}) {
  const qb: any = {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue(overrides.result ?? [[], 0]),
    getOne: jest.fn().mockResolvedValue(overrides.getOne ?? null),
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
    findOneBy: jest.fn(),
    softDelete: jest.fn(),
    findOne: jest.fn(),
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
    it('uses QueryBuilder with innerJoinAndSelect on user and leftJoinAndSelect on specialties when no search', async () => {
      const doctors = [makeDoctor()]
      const qb = makeQueryBuilderMock({ result: [doctors, 1] })
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await repository.findAll(2, 10, CLINIC_ID)

      expect(repo.createQueryBuilder).toHaveBeenCalledWith('doctor')
      expect(qb.innerJoinAndSelect).toHaveBeenCalledWith('doctor.user', 'user')
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('doctor.specialties', 'specialty')
      expect(qb.where).toHaveBeenCalledWith('user.clinicId = :clinicId', { clinicId: CLINIC_ID })
      expect(qb.orderBy).toHaveBeenCalledWith('doctor.createdAt', 'DESC')
      expect(qb.take).toHaveBeenCalledWith(10)
      expect(qb.skip).toHaveBeenCalledWith(10)
      expect(qb.andWhere).not.toHaveBeenCalled()
      expect(qb.getManyAndCount).toHaveBeenCalled()
      expect(result).toEqual([doctors, 1])
    })

    it('adds andWhere clause with ILIKE when search is provided', async () => {
      const doctors = [makeDoctor()]
      const qb = makeQueryBuilderMock({ result: [doctors, 1] })
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await repository.findAll(1, 20, CLINIC_ID, 'Cardio')

      expect(qb.where).toHaveBeenCalledWith('user.clinicId = :clinicId', { clinicId: CLINIC_ID })
      expect(qb.andWhere).toHaveBeenCalledWith(
        'user.fullName ILIKE :search OR specialty.name ILIKE :search',
        { search: '%Cardio%' },
      )
      expect(qb.getManyAndCount).toHaveBeenCalled()
      expect(result).toEqual([doctors, 1])
    })

    it('calculates correct skip for pagination', async () => {
      const qb = makeQueryBuilderMock({ result: [[], 0] })
      repo.createQueryBuilder.mockReturnValue(qb)

      await repository.findAll(3, 10, CLINIC_ID)

      expect(qb.skip).toHaveBeenCalledWith(20)
      expect(qb.take).toHaveBeenCalledWith(10)
    })
  })

  describe('findById', () => {
    it('uses QueryBuilder with innerJoinAndSelect and where by id', async () => {
      const doctor = makeDoctor()
      const qb = makeQueryBuilderMock({ getOne: doctor })
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await repository.findById('uuid-1', CLINIC_ID)

      expect(repo.createQueryBuilder).toHaveBeenCalledWith('doctor')
      expect(qb.innerJoinAndSelect).toHaveBeenCalledWith('doctor.user', 'user')
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('doctor.specialties', 'specialty')
      expect(qb.where).toHaveBeenCalledWith('doctor.id = :id', { id: 'uuid-1' })
      expect(qb.andWhere).toHaveBeenCalledWith('user.clinicId = :clinicId', { clinicId: CLINIC_ID })
      expect(qb.getOne).toHaveBeenCalled()
      expect(result).toBe(doctor)
    })

    it('returns null when not found', async () => {
      const qb = makeQueryBuilderMock({ getOne: null })
      repo.createQueryBuilder.mockReturnValue(qb)

      expect(await repository.findById('missing', CLINIC_ID)).toBeNull()
    })
  })

  describe('findByUserId', () => {
    it('uses QueryBuilder with innerJoinAndSelect and where by userId', async () => {
      const doctor = makeDoctor()
      const qb = makeQueryBuilderMock({ getOne: doctor })
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await repository.findByUserId('user-uuid-1', CLINIC_ID)

      expect(repo.createQueryBuilder).toHaveBeenCalledWith('doctor')
      expect(qb.innerJoinAndSelect).toHaveBeenCalledWith('doctor.user', 'user')
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('doctor.specialties', 'specialty')
      expect(qb.where).toHaveBeenCalledWith('doctor.userId = :userId', { userId: 'user-uuid-1' })
      expect(qb.andWhere).toHaveBeenCalledWith('user.clinicId = :clinicId', { clinicId: CLINIC_ID })
      expect(qb.getOne).toHaveBeenCalled()
      expect(result).toBe(doctor)
    })

    it('returns null when not found', async () => {
      const qb = makeQueryBuilderMock({ getOne: null })
      repo.createQueryBuilder.mockReturnValue(qb)

      expect(await repository.findByUserId('missing', CLINIC_ID)).toBeNull()
    })
  })

  describe('findByCrmNumber', () => {
    it('uses QueryBuilder with clinicId filter when found', async () => {
      const doctor = makeDoctor()
      const qb = makeQueryBuilderMock({ getOne: doctor })
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await repository.findByCrmNumber('12345/SP', CLINIC_ID)

      expect(repo.createQueryBuilder).toHaveBeenCalledWith('doctor')
      expect(qb.where).toHaveBeenCalledWith('doctor.crmNumber = :crmNumber', { crmNumber: '12345/SP' })
      expect(qb.andWhere).toHaveBeenCalledWith('user.clinicId = :clinicId', { clinicId: CLINIC_ID })
      expect(result).toBe(doctor)
    })

    it('returns null when not found', async () => {
      const qb = makeQueryBuilderMock({ getOne: null })
      repo.createQueryBuilder.mockReturnValue(qb)

      expect(await repository.findByCrmNumber('99999/RJ', CLINIC_ID)).toBeNull()
    })
  })

  describe('create', () => {
    it('creates doctor with specialties, saves, and reloads with all relations', async () => {
      const data = { userId: 'user-uuid-1', crmNumber: '12345/SP', bio: null }
      const clinicId = CLINIC_ID
      const specialties = [{ id: 'spec-uuid-1', name: 'Cardiologia' }] as any
      const entity = { id: 'uuid-1', ...data, specialties: [] } as unknown as Doctor
      const withRelations = makeDoctor()

      const managerRepo = (repo.manager as any)._managerRepo
      managerRepo.create.mockReturnValue(entity)
      managerRepo.save.mockResolvedValue(entity)
      managerRepo.findOne.mockResolvedValue(withRelations)

      const result = await repository.create(data as any, clinicId, specialties)

      expect(managerRepo.create).toHaveBeenCalledWith({
        userId: data.userId,
        clinicId,
        crmNumber: data.crmNumber,
        bio: data.bio,
      })
      expect(entity.specialties).toBe(specialties)
      expect(managerRepo.save).toHaveBeenCalledWith(entity)
      expect(managerRepo.findOne).toHaveBeenCalledWith({
        where: { id: entity.id },
        relations: ['user', 'specialties'],
      })
      expect(result).toBe(withRelations)
    })

    it('uses queryRunner manager repo when provided', async () => {
      const data = { userId: 'user-uuid-1', crmNumber: '12345/SP', bio: null }
      const clinicId = CLINIC_ID
      const specialties = [] as any
      const entity = { id: 'uuid-qr', specialties: [] } as unknown as Doctor
      const withRelations = makeDoctor({ id: 'uuid-qr' })

      const qrRepo = makeManagerRepo()
      qrRepo.create.mockReturnValue(entity)
      qrRepo.save.mockResolvedValue(entity)
      qrRepo.findOne.mockResolvedValue(withRelations)
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as any

      const result = await repository.create(data as any, clinicId, specialties, queryRunner)

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
      managerRepo.findOne
        .mockResolvedValueOnce(doctor)
        .mockResolvedValueOnce(updated)
      managerRepo.save.mockResolvedValue({ ...doctor, specialties: newSpecialties })

      const result = await repository.update('uuid-1', { crmNumber: '99999/SP' }, newSpecialties)

      expect(managerRepo.findOne).toHaveBeenNthCalledWith(1, {
        where: { id: 'uuid-1' },
        relations: ['specialties'],
      })
      expect(managerRepo.save).toHaveBeenCalled()
      expect(managerRepo.findOne).toHaveBeenNthCalledWith(2, {
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
