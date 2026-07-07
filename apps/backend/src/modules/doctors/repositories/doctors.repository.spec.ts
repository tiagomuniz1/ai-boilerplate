import { Repository } from 'typeorm'
import { DoctorsRepository } from './doctors.repository'
import { Doctor } from '../entities/doctor.entity'
import { User } from '../../users/entities/user.entity'

const CLINIC_ID = 'fixed-clinic-uuid'
const DOCTOR_RELATIONS = ['user', 'crms', 'doctorSpecialties', 'doctorSpecialties.specialty']

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
    create: jest.fn((x) => ({ ...x })),
    save: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
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
    crms: [{ id: 'crm-uuid-1', number: '12345', state: 'SP', isPrimary: true }],
    doctorSpecialties: [{ id: 'ds-uuid-1', specialtyId: 'spec-uuid-1', specialty: { id: 'spec-uuid-1', name: 'Cardiologia' }, rqe: null }],
    bio: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as unknown as Doctor
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
    it('joins user, crms and nested specialty when no search', async () => {
      const doctors = [makeDoctor()]
      const qb = makeQueryBuilderMock({ result: [doctors, 1] })
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await repository.findAll(2, 10, CLINIC_ID)

      expect(repo.createQueryBuilder).toHaveBeenCalledWith('doctor')
      expect(qb.innerJoinAndSelect).toHaveBeenCalledWith('doctor.user', 'user')
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('doctor.crms', 'crm')
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('doctor.doctorSpecialties', 'doctorSpecialty')
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('doctorSpecialty.specialty', 'specialty')
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

      expect(qb.andWhere).toHaveBeenCalledWith(
        'user.fullName ILIKE :search OR specialty.name ILIKE :search',
        { search: '%Cardio%' },
      )
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
    it('uses QueryBuilder with joins and where by id', async () => {
      const doctor = makeDoctor()
      const qb = makeQueryBuilderMock({ getOne: doctor })
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await repository.findById('uuid-1', CLINIC_ID)

      expect(qb.innerJoinAndSelect).toHaveBeenCalledWith('doctor.user', 'user')
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('doctor.crms', 'crm')
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('doctorSpecialty.specialty', 'specialty')
      expect(qb.where).toHaveBeenCalledWith('doctor.id = :id', { id: 'uuid-1' })
      expect(qb.andWhere).toHaveBeenCalledWith('user.clinicId = :clinicId', { clinicId: CLINIC_ID })
      expect(result).toBe(doctor)
    })

    it('returns null when not found', async () => {
      const qb = makeQueryBuilderMock({ getOne: null })
      repo.createQueryBuilder.mockReturnValue(qb)

      expect(await repository.findById('missing', CLINIC_ID)).toBeNull()
    })
  })

  describe('findByUserId', () => {
    it('uses QueryBuilder with joins and where by userId', async () => {
      const doctor = makeDoctor()
      const qb = makeQueryBuilderMock({ getOne: doctor })
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await repository.findByUserId('user-uuid-1', CLINIC_ID)

      expect(qb.innerJoinAndSelect).toHaveBeenCalledWith('doctor.user', 'user')
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('doctor.doctorSpecialties', 'doctorSpecialty')
      expect(qb.where).toHaveBeenCalledWith('doctor.userId = :userId', { userId: 'user-uuid-1' })
      expect(qb.andWhere).toHaveBeenCalledWith('user.clinicId = :clinicId', { clinicId: CLINIC_ID })
      expect(result).toBe(doctor)
    })

    it('returns null when not found', async () => {
      const qb = makeQueryBuilderMock({ getOne: null })
      repo.createQueryBuilder.mockReturnValue(qb)

      expect(await repository.findByUserId('missing', CLINIC_ID)).toBeNull()
    })
  })

  describe('findByCrm', () => {
    it('joins crms and filters by number, state, clinic and not-deleted', async () => {
      const doctor = makeDoctor()
      const qb = makeQueryBuilderMock({ getOne: doctor })
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await repository.findByCrm('12345', 'SP', CLINIC_ID)

      expect(repo.createQueryBuilder).toHaveBeenCalledWith('doctor')
      expect(qb.innerJoin).toHaveBeenCalledWith('doctor.crms', 'crm')
      expect(qb.where).toHaveBeenCalledWith('crm.number = :number', { number: '12345' })
      expect(qb.andWhere).toHaveBeenCalledWith('crm.state = :state', { state: 'SP' })
      expect(qb.andWhere).toHaveBeenCalledWith('crm.clinicId = :clinicId', { clinicId: CLINIC_ID })
      expect(qb.andWhere).toHaveBeenCalledWith('crm.deletedAt IS NULL')
      expect(result).toBe(doctor)
    })

    it('returns null when not found', async () => {
      const qb = makeQueryBuilderMock({ getOne: null })
      repo.createQueryBuilder.mockReturnValue(qb)

      expect(await repository.findByCrm('99999', 'RJ', CLINIC_ID)).toBeNull()
    })
  })

  describe('create', () => {
    it('creates doctor with crms and specialties, saves, and reloads with all relations', async () => {
      const data = { userId: 'user-uuid-1', bio: null }
      const crms = [{ number: '12345', state: 'SP', isPrimary: true }]
      const specialties = [{ specialty: { id: 'spec-uuid-1' }, rqe: null }] as any
      const withRelations = makeDoctor()

      const managerRepo = (repo.manager as any)._managerRepo
      managerRepo.save.mockResolvedValue({ id: 'uuid-1' })
      managerRepo.findOne.mockResolvedValue(withRelations)

      const result = await repository.create(data as any, CLINIC_ID, crms, specialties)

      expect(managerRepo.create).toHaveBeenCalledWith({ userId: 'user-uuid-1', clinicId: CLINIC_ID, bio: null })
      expect(managerRepo.create).toHaveBeenCalledWith({ clinicId: CLINIC_ID, number: '12345', state: 'SP', isPrimary: true })
      expect(managerRepo.create).toHaveBeenCalledWith({ specialtyId: 'spec-uuid-1', rqe: null })
      expect(managerRepo.save).toHaveBeenCalled()
      expect(managerRepo.findOne).toHaveBeenCalledWith({ where: { id: 'uuid-1' }, relations: DOCTOR_RELATIONS })
      expect(result).toBe(withRelations)
    })

    it('uses queryRunner manager repo when provided', async () => {
      const data = { userId: 'user-uuid-1', bio: null }
      const withRelations = makeDoctor({ id: 'uuid-qr' })

      const qrRepo = makeManagerRepo()
      qrRepo.save.mockResolvedValue({ id: 'uuid-qr' })
      qrRepo.findOne.mockResolvedValue(withRelations)
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as any

      const result = await repository.create(data as any, CLINIC_ID, [], [], queryRunner)

      expect(qrRepo.save).toHaveBeenCalled()
      expect((repo.manager as any)._managerRepo.save).not.toHaveBeenCalled()
      expect(result).toBe(withRelations)
    })
  })

  describe('update', () => {
    it('loads doctor, deletes and re-inserts crms and specialties, and reloads', async () => {
      const doctor = makeDoctor()
      const newSpecialties = [{ specialty: { id: 'spec-uuid-2' }, rqe: '5566' }] as any
      const newCrms = [{ number: '99999', state: 'SP', isPrimary: true }]
      const updated = makeDoctor()

      const managerRepo = (repo.manager as any)._managerRepo
      managerRepo.findOne.mockResolvedValueOnce(doctor).mockResolvedValueOnce(updated)
      managerRepo.save.mockResolvedValue({ id: 'uuid-1' })
      managerRepo.delete.mockResolvedValue({ affected: 1 })

      const result = await repository.update('uuid-1', { bio: 'new' }, newCrms, newSpecialties)

      expect(managerRepo.findOne).toHaveBeenNthCalledWith(1, {
        where: { id: 'uuid-1' },
        relations: ['crms', 'doctorSpecialties'],
      })
      expect(managerRepo.delete).toHaveBeenCalledWith({ doctorId: 'uuid-1' })
      expect(managerRepo.create).toHaveBeenCalledWith({ doctorId: 'uuid-1', clinicId: doctor.clinicId, number: '99999', state: 'SP', isPrimary: true })
      expect(managerRepo.create).toHaveBeenCalledWith({ doctorId: 'uuid-1', specialtyId: 'spec-uuid-2', rqe: '5566' })
      expect(managerRepo.save).toHaveBeenCalled()
      expect(managerRepo.findOne).toHaveBeenNthCalledWith(2, {
        where: { id: 'uuid-1' },
        relations: DOCTOR_RELATIONS,
      })
      expect(result).toBe(updated)
    })

    it('does not delete crms or specialties when null is passed', async () => {
      const doctor = makeDoctor()

      const managerRepo = (repo.manager as any)._managerRepo
      managerRepo.findOne.mockResolvedValue(doctor)
      managerRepo.save.mockResolvedValue({ id: 'uuid-1' })

      await repository.update('uuid-1', { bio: 'x' }, null, null)

      expect(managerRepo.delete).not.toHaveBeenCalled()
    })

    it('throws when doctor is not found', async () => {
      const managerRepo = (repo.manager as any)._managerRepo
      managerRepo.findOne.mockResolvedValue(null)

      await expect(repository.update('missing', {}, null, null)).rejects.toThrow('Doctor missing not found')
    })

    it('uses queryRunner repository when provided', async () => {
      const doctor = makeDoctor()

      const qrRepo = makeManagerRepo()
      qrRepo.findOne.mockResolvedValue(doctor)
      qrRepo.save.mockResolvedValue({ id: 'uuid-1' })
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as any

      await repository.update('uuid-1', { bio: 'new bio' }, null, null, queryRunner)

      expect(qrRepo.findOne).toHaveBeenCalled()
      expect(qrRepo.save).toHaveBeenCalled()
      expect((repo.manager as any)._managerRepo.save).not.toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('soft deletes the doctor crms and the doctor', async () => {
      const managerRepo = (repo.manager as any)._managerRepo
      managerRepo.softDelete.mockResolvedValue({ affected: 1 })

      await repository.delete('uuid-1')

      expect(managerRepo.softDelete).toHaveBeenCalledWith({ doctorId: 'uuid-1' })
      expect(managerRepo.softDelete).toHaveBeenCalledWith('uuid-1')
    })

    it('uses queryRunner repository when provided', async () => {
      const qrRepo = makeManagerRepo()
      qrRepo.softDelete = jest.fn().mockResolvedValue({ affected: 1 })
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as any

      await repository.delete('uuid-1', queryRunner)

      expect(qrRepo.softDelete).toHaveBeenCalledWith({ doctorId: 'uuid-1' })
      expect(qrRepo.softDelete).toHaveBeenCalledWith('uuid-1')
    })
  })
})
