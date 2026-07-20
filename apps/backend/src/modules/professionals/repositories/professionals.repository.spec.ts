import { Repository } from 'typeorm'
import { CouncilType } from '@app/shared'
import { ProfessionalsRepository } from './professionals.repository'
import { Professional } from '../entities/professional.entity'
import { User } from '../../users/entities/user.entity'

const CLINIC_ID = 'fixed-clinic-uuid'
const PROFESSIONAL_RELATIONS = ['user', 'registrations', 'professionalSpecialties', 'professionalSpecialties.specialty']

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

function makeRepo(): jest.Mocked<Repository<Professional>> {
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
  } as unknown as jest.Mocked<Repository<Professional>>
}

function makeUser(): User {
  return {
    id: 'user-uuid-1',
    fullName: 'Alice',
    email: 'alice@clinic.com',
  } as User
}

function makeProfessional(overrides = {}): Professional {
  return {
    id: 'uuid-1',
    userId: 'user-uuid-1',
    user: makeUser(),
    registrations: [{ id: 'reg-uuid-1', councilType: CouncilType.CRM, number: '12345', state: 'SP', isPrimary: true }],
    professionalSpecialties: [
      { id: 'ps-uuid-1', specialtyId: 'spec-uuid-1', specialty: { id: 'spec-uuid-1', name: 'Cardiologia' }, registryNumber: null },
    ],
    bio: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as unknown as Professional
}

describe('ProfessionalsRepository', () => {
  let repo: jest.Mocked<Repository<Professional>>
  let repository: ProfessionalsRepository

  beforeEach(() => {
    jest.clearAllMocks()
    repo = makeRepo()
    repository = new ProfessionalsRepository(repo)
  })

  describe('findAll', () => {
    it('joins user, registrations and nested specialty when no search', async () => {
      const professionals = [makeProfessional()]
      const qb = makeQueryBuilderMock({ result: [professionals, 1] })
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await repository.findAll(2, 10, CLINIC_ID)

      expect(repo.createQueryBuilder).toHaveBeenCalledWith('professional')
      expect(qb.innerJoinAndSelect).toHaveBeenCalledWith('professional.user', 'user')
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('professional.registrations', 'registration')
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('professional.professionalSpecialties', 'professionalSpecialty')
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('professionalSpecialty.specialty', 'specialty')
      expect(qb.where).toHaveBeenCalledWith('user.clinicId = :clinicId', { clinicId: CLINIC_ID })
      expect(qb.orderBy).toHaveBeenCalledWith('professional.createdAt', 'DESC')
      expect(qb.take).toHaveBeenCalledWith(10)
      expect(qb.skip).toHaveBeenCalledWith(10)
      expect(qb.andWhere).not.toHaveBeenCalled()
      expect(qb.getManyAndCount).toHaveBeenCalled()
      expect(result).toEqual([professionals, 1])
    })

    it('adds andWhere clause with ILIKE when search is provided', async () => {
      const professionals = [makeProfessional()]
      const qb = makeQueryBuilderMock({ result: [professionals, 1] })
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await repository.findAll(1, 20, CLINIC_ID, 'Cardio')

      expect(qb.andWhere).toHaveBeenCalledWith(
        'user.fullName ILIKE :search OR specialty.name ILIKE :search',
        { search: '%Cardio%' },
      )
      expect(result).toEqual([professionals, 1])
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
      const professional = makeProfessional()
      const qb = makeQueryBuilderMock({ getOne: professional })
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await repository.findById('uuid-1', CLINIC_ID)

      expect(qb.innerJoinAndSelect).toHaveBeenCalledWith('professional.user', 'user')
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('professional.registrations', 'registration')
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('professionalSpecialty.specialty', 'specialty')
      expect(qb.where).toHaveBeenCalledWith('professional.id = :id', { id: 'uuid-1' })
      expect(qb.andWhere).toHaveBeenCalledWith('user.clinicId = :clinicId', { clinicId: CLINIC_ID })
      expect(result).toBe(professional)
    })

    it('returns null when not found', async () => {
      const qb = makeQueryBuilderMock({ getOne: null })
      repo.createQueryBuilder.mockReturnValue(qb)

      expect(await repository.findById('missing', CLINIC_ID)).toBeNull()
    })
  })

  describe('findByUserId', () => {
    it('uses QueryBuilder with joins and where by userId', async () => {
      const professional = makeProfessional()
      const qb = makeQueryBuilderMock({ getOne: professional })
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await repository.findByUserId('user-uuid-1', CLINIC_ID)

      expect(qb.innerJoinAndSelect).toHaveBeenCalledWith('professional.user', 'user')
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('professional.professionalSpecialties', 'professionalSpecialty')
      expect(qb.where).toHaveBeenCalledWith('professional.userId = :userId', { userId: 'user-uuid-1' })
      expect(qb.andWhere).toHaveBeenCalledWith('user.clinicId = :clinicId', { clinicId: CLINIC_ID })
      expect(result).toBe(professional)
    })

    it('returns null when not found', async () => {
      const qb = makeQueryBuilderMock({ getOne: null })
      repo.createQueryBuilder.mockReturnValue(qb)

      expect(await repository.findByUserId('missing', CLINIC_ID)).toBeNull()
    })
  })

  describe('findByRegistration', () => {
    it('joins registrations and filters by councilType, number, state, clinic and not-deleted', async () => {
      const professional = makeProfessional()
      const qb = makeQueryBuilderMock({ getOne: professional })
      repo.createQueryBuilder.mockReturnValue(qb)

      const result = await repository.findByRegistration(CouncilType.CRM, '12345', 'SP', CLINIC_ID)

      expect(repo.createQueryBuilder).toHaveBeenCalledWith('professional')
      expect(qb.innerJoin).toHaveBeenCalledWith('professional.registrations', 'registration')
      expect(qb.where).toHaveBeenCalledWith('registration.councilType = :councilType', { councilType: CouncilType.CRM })
      expect(qb.andWhere).toHaveBeenCalledWith('registration.number = :number', { number: '12345' })
      expect(qb.andWhere).toHaveBeenCalledWith('registration.state = :state', { state: 'SP' })
      expect(qb.andWhere).toHaveBeenCalledWith('registration.clinicId = :clinicId', { clinicId: CLINIC_ID })
      expect(qb.andWhere).toHaveBeenCalledWith('registration.deletedAt IS NULL')
      expect(result).toBe(professional)
    })

    it('returns null when not found', async () => {
      const qb = makeQueryBuilderMock({ getOne: null })
      repo.createQueryBuilder.mockReturnValue(qb)

      expect(await repository.findByRegistration(CouncilType.CRN, '99999', 'RJ', CLINIC_ID)).toBeNull()
    })
  })

  describe('create', () => {
    it('creates professional with registrations and specialties, saves, and reloads with all relations', async () => {
      const data = { userId: 'user-uuid-1', bio: null }
      const registrations = [{ councilType: CouncilType.CRM, number: '12345', state: 'SP', isPrimary: true }]
      const specialties = [{ specialty: { id: 'spec-uuid-1' }, registryNumber: null }] as any
      const withRelations = makeProfessional()

      const managerRepo = (repo.manager as any)._managerRepo
      managerRepo.save.mockResolvedValue({ id: 'uuid-1' })
      managerRepo.findOne.mockResolvedValue(withRelations)

      const result = await repository.create(data as any, CLINIC_ID, registrations, specialties)

      expect(managerRepo.create).toHaveBeenCalledWith({ userId: 'user-uuid-1', clinicId: CLINIC_ID, bio: null })
      expect(managerRepo.create).toHaveBeenCalledWith({
        clinicId: CLINIC_ID,
        councilType: CouncilType.CRM,
        number: '12345',
        state: 'SP',
        isPrimary: true,
      })
      expect(managerRepo.create).toHaveBeenCalledWith({ specialtyId: 'spec-uuid-1', registryNumber: null })
      expect(managerRepo.save).toHaveBeenCalled()
      expect(managerRepo.findOne).toHaveBeenCalledWith({ where: { id: 'uuid-1' }, relations: PROFESSIONAL_RELATIONS })
      expect(result).toBe(withRelations)
    })

    it('uses queryRunner manager repo when provided', async () => {
      const data = { userId: 'user-uuid-1', bio: null }
      const withRelations = makeProfessional({ id: 'uuid-qr' })

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
    it('loads professional, deletes and re-inserts registrations and specialties, and reloads', async () => {
      const professional = makeProfessional()
      const newSpecialties = [{ specialty: { id: 'spec-uuid-2' }, registryNumber: '5566' }] as any
      const newRegistrations = [{ councilType: CouncilType.CRM, number: '99999', state: 'SP', isPrimary: true }]
      const updated = makeProfessional()

      const managerRepo = (repo.manager as any)._managerRepo
      managerRepo.findOne.mockResolvedValueOnce(professional).mockResolvedValueOnce(updated)
      managerRepo.save.mockResolvedValue({ id: 'uuid-1' })
      managerRepo.delete.mockResolvedValue({ affected: 1 })

      const result = await repository.update('uuid-1', { bio: 'new' }, newRegistrations, newSpecialties)

      expect(managerRepo.findOne).toHaveBeenNthCalledWith(1, {
        where: { id: 'uuid-1' },
        relations: ['registrations', 'professionalSpecialties'],
      })
      expect(managerRepo.delete).toHaveBeenCalledWith({ professionalId: 'uuid-1' })
      expect(managerRepo.create).toHaveBeenCalledWith({
        professionalId: 'uuid-1',
        clinicId: professional.clinicId,
        councilType: CouncilType.CRM,
        number: '99999',
        state: 'SP',
        isPrimary: true,
      })
      expect(managerRepo.create).toHaveBeenCalledWith({ professionalId: 'uuid-1', specialtyId: 'spec-uuid-2', registryNumber: '5566' })
      expect(managerRepo.save).toHaveBeenCalled()
      expect(managerRepo.findOne).toHaveBeenNthCalledWith(2, {
        where: { id: 'uuid-1' },
        relations: PROFESSIONAL_RELATIONS,
      })
      expect(result).toBe(updated)
    })

    it('does not delete registrations or specialties when null is passed', async () => {
      const professional = makeProfessional()

      const managerRepo = (repo.manager as any)._managerRepo
      managerRepo.findOne.mockResolvedValue(professional)
      managerRepo.save.mockResolvedValue({ id: 'uuid-1' })

      await repository.update('uuid-1', { bio: 'x' }, null, null)

      expect(managerRepo.delete).not.toHaveBeenCalled()
    })

    it('throws when professional is not found', async () => {
      const managerRepo = (repo.manager as any)._managerRepo
      managerRepo.findOne.mockResolvedValue(null)

      await expect(repository.update('missing', {}, null, null)).rejects.toThrow('Professional missing not found')
    })

    it('uses queryRunner repository when provided', async () => {
      const professional = makeProfessional()

      const qrRepo = makeManagerRepo()
      qrRepo.findOne.mockResolvedValue(professional)
      qrRepo.save.mockResolvedValue({ id: 'uuid-1' })
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as any

      await repository.update('uuid-1', { bio: 'new bio' }, null, null, queryRunner)

      expect(qrRepo.findOne).toHaveBeenCalled()
      expect(qrRepo.save).toHaveBeenCalled()
      expect((repo.manager as any)._managerRepo.save).not.toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('soft deletes the professional registrations and the professional', async () => {
      const managerRepo = (repo.manager as any)._managerRepo
      managerRepo.softDelete.mockResolvedValue({ affected: 1 })

      await repository.delete('uuid-1')

      expect(managerRepo.softDelete).toHaveBeenCalledWith({ professionalId: 'uuid-1' })
      expect(managerRepo.softDelete).toHaveBeenCalledWith('uuid-1')
    })

    it('uses queryRunner repository when provided', async () => {
      const qrRepo = makeManagerRepo()
      qrRepo.softDelete = jest.fn().mockResolvedValue({ affected: 1 })
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as any

      await repository.delete('uuid-1', queryRunner)

      expect(qrRepo.softDelete).toHaveBeenCalledWith({ professionalId: 'uuid-1' })
      expect(qrRepo.softDelete).toHaveBeenCalledWith('uuid-1')
    })
  })
})
