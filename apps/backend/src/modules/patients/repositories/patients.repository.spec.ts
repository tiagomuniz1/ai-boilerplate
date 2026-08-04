import { Repository } from 'typeorm'
import { PatientGender, UserRole } from '@app/shared'
import { PatientsRepository } from './patients.repository'
import { Patient } from '../entities/patient.entity'

const CLINIC_ID = 'fixed-clinic-uuid'

function makeQueryBuilderMock(overrides: { result?: any; getOne?: any; getMany?: any; getCount?: number } = {}) {
  return {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue(overrides.result ?? [[], 0]),
    getMany: jest.fn().mockResolvedValue(overrides.getMany ?? []),
    getCount: jest.fn().mockResolvedValue(overrides.getCount ?? 0),
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
    manager: {
      connection: { options: {} },
    },
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
    it('uses split query (no join) to paginate IDs when no search is provided', async () => {
      const patient = makePatient()
      // idsQb returns list of patients with id; countQb returns count; entityQb returns full patients
      const idsQb = makeQueryBuilderMock({ getMany: [{ id: patient.id }] })
      const countQb = makeQueryBuilderMock({ getCount: 1 })
      const entityQb = makeQueryBuilderMock({ getMany: [patient] })

      let callCount = 0
      repo.createQueryBuilder.mockImplementation(() => {
        callCount++
        if (callCount === 1) return idsQb as any
        if (callCount === 2) return countQb as any
        return entityQb as any
      })

      const result = await repository.findAll(2, 10, CLINIC_ID)

      expect(idsQb.where).toHaveBeenCalledWith('patient.clinic_id = :clinicId', { clinicId: CLINIC_ID })
      expect(idsQb.skip).toHaveBeenCalledWith(10)
      expect(idsQb.take).toHaveBeenCalledWith(10)
      expect(idsQb.innerJoinAndSelect).not.toHaveBeenCalled()
      expect(entityQb.innerJoinAndSelect).toHaveBeenCalledWith('patient.user', 'user')
      expect(result).toEqual([[patient], 1])
    })

    it('returns empty array without loading entities when no IDs found', async () => {
      const idsQb = makeQueryBuilderMock({ getMany: [] })
      const countQb = makeQueryBuilderMock({ getCount: 0 })

      let callCount = 0
      repo.createQueryBuilder.mockImplementation(() => {
        callCount++
        return callCount === 1 ? (idsQb as any) : (countQb as any)
      })

      const result = await repository.findAll(5, 10, CLINIC_ID)

      expect(result).toEqual([[], 0])
      expect(callCount).toBe(2)
    })

    it('uses trigram subquery path when search is a name (text)', async () => {
      const patient = makePatient()
      const idsQb = makeQueryBuilderMock({ getMany: [{ id: patient.id }] })
      const countQb = makeQueryBuilderMock({ getCount: 1 })
      const entityQb = makeQueryBuilderMock({ getMany: [patient] })

      let callCount = 0
      repo.createQueryBuilder.mockImplementation(() => {
        callCount++
        if (callCount === 1) return idsQb as any
        if (callCount === 2) return countQb as any
        return entityQb as any
      })

      const result = await repository.findAll(1, 20, CLINIC_ID, 'alice')

      const expectedSql = 'patient.user_id IN (SELECT u.id FROM users u WHERE u.clinic_id = :clinicId AND u.full_name ILIKE :search AND u.deleted_at IS NULL)'
      expect(idsQb.where).toHaveBeenCalledWith(expectedSql, { clinicId: CLINIC_ID, search: '%alice%' })
      expect(countQb.where).toHaveBeenCalledWith(expectedSql, { clinicId: CLINIC_ID, search: '%alice%' })
      expect(entityQb.innerJoinAndSelect).toHaveBeenCalledWith('patient.user', 'user')
      expect(result).toEqual([[patient], 1])
    })

    it('returns empty list immediately when trigram search finds no matching patient ids', async () => {
      const idsQb = makeQueryBuilderMock({ getMany: [] })
      const countQb = makeQueryBuilderMock({ getCount: 0 })

      let callCount = 0
      repo.createQueryBuilder.mockImplementation(() => {
        callCount++
        if (callCount === 1) return idsQb as any
        return countQb as any
      })

      const result = await repository.findAll(1, 20, CLINIC_ID, 'nobody')

      expect(result).toEqual([[], 0])
    })

    it('uses schema-qualified table reference when schema is set in connection options', async () => {
      const patient = makePatient()
      const idsQb = makeQueryBuilderMock({ getMany: [{ id: patient.id }] })
      const countQb = makeQueryBuilderMock({ getCount: 1 })
      const entityQb = makeQueryBuilderMock({ getMany: [patient] })

      let callCount = 0
      repo.createQueryBuilder.mockImplementation(() => {
        callCount++
        if (callCount === 1) return idsQb as any
        if (callCount === 2) return countQb as any
        return entityQb as any
      })
      ;(repo as any).manager.connection.options.schema = 'tenant'

      await repository.findAll(1, 20, CLINIC_ID, 'alice')

      const expectedSql = 'patient.user_id IN (SELECT u.id FROM "tenant"."users" u WHERE u.clinic_id = :clinicId AND u.full_name ILIKE :search AND u.deleted_at IS NULL)'
      expect(idsQb.where).toHaveBeenCalledWith(expectedSql, { clinicId: CLINIC_ID, search: '%alice%' })
      expect(countQb.where).toHaveBeenCalledWith(expectedSql, { clinicId: CLINIC_ID, search: '%alice%' })
    })

    it('uses exact document_number match when search is all digits', async () => {
      const qb = makeQueryBuilderMock({ result: [[], 0] })
      repo.createQueryBuilder.mockReturnValue(qb as any)

      await repository.findAll(1, 20, CLINIC_ID, '12345678901')

      expect(qb.innerJoinAndSelect).toHaveBeenCalledWith('patient.user', 'user')
      expect(qb.where).toHaveBeenCalledWith('patient.clinic_id = :clinicId', { clinicId: CLINIC_ID })
      expect(qb.andWhere).toHaveBeenCalledWith('patient.document_number = :doc', { doc: '12345678901' })
      expect(qb.getManyAndCount).toHaveBeenCalled()
    })

    it('calculates correct skip for pagination', async () => {
      const idsQb = makeQueryBuilderMock({ getMany: [] })
      const countQb = makeQueryBuilderMock({ getCount: 0 })

      let callCount = 0
      repo.createQueryBuilder.mockImplementation(() => {
        callCount++
        return callCount === 1 ? (idsQb as any) : (countQb as any)
      })

      await repository.findAll(3, 10, CLINIC_ID)

      expect(idsQb.skip).toHaveBeenCalledWith(20)
      expect(idsQb.take).toHaveBeenCalledWith(10)
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
    it('uses findOneBy with documentNumber and clinicId', async () => {
      const patient = makePatient()
      repo.findOneBy.mockResolvedValue(patient)

      const result = await repository.findByDocumentNumber('12345678901', CLINIC_ID)

      expect(repo.findOneBy).toHaveBeenCalledWith({ documentNumber: '12345678901', clinicId: CLINIC_ID })
      expect(result).toBe(patient)
    })

    it('returns null when not found', async () => {
      repo.findOneBy.mockResolvedValue(null)

      expect(await repository.findByDocumentNumber('00000000000', CLINIC_ID)).toBeNull()
    })
  })

  describe('findActiveDependents', () => {
    it('delegates to findDependentsByResponsibleIds with a single id', async () => {
      const dependent = makePatient({ id: 'dependent-uuid', responsiblePatientId: 'uuid-1' })
      const qb = makeQueryBuilderMock({ getMany: [dependent] })
      repo.createQueryBuilder.mockReturnValue(qb as any)

      const result = await repository.findActiveDependents('uuid-1', CLINIC_ID)

      expect(qb.where).toHaveBeenCalledWith('patient.responsible_patient_id IN (:...responsibleIds)', {
        responsibleIds: ['uuid-1'],
      })
      expect(qb.andWhere).toHaveBeenCalledWith('patient.clinic_id = :clinicId', { clinicId: CLINIC_ID })
      expect(result).toEqual([dependent])
    })
  })

  describe('findResponsiblePatientsByIds', () => {
    it('returns empty array without querying when ids is empty', async () => {
      const result = await repository.findResponsiblePatientsByIds([], CLINIC_ID)

      expect(result).toEqual([])
      expect(repo.createQueryBuilder).not.toHaveBeenCalled()
    })

    it('queries patients by id within the clinic', async () => {
      const patient = makePatient()
      const qb = makeQueryBuilderMock({ getMany: [patient] })
      repo.createQueryBuilder.mockReturnValue(qb as any)

      const result = await repository.findResponsiblePatientsByIds(['uuid-1'], CLINIC_ID)

      expect(qb.innerJoinAndSelect).toHaveBeenCalledWith('patient.user', 'user')
      expect(qb.where).toHaveBeenCalledWith('patient.id IN (:...ids)', { ids: ['uuid-1'] })
      expect(qb.andWhere).toHaveBeenCalledWith('patient.clinic_id = :clinicId', { clinicId: CLINIC_ID })
      expect(result).toEqual([patient])
    })
  })

  describe('findDependentsByResponsibleIds', () => {
    it('returns empty array without querying when responsibleIds is empty', async () => {
      const result = await repository.findDependentsByResponsibleIds([], CLINIC_ID)

      expect(result).toEqual([])
      expect(repo.createQueryBuilder).not.toHaveBeenCalled()
    })

    it('queries dependents by responsiblePatientId within the clinic', async () => {
      const dependent = makePatient({ id: 'dependent-uuid', responsiblePatientId: 'uuid-1' })
      const qb = makeQueryBuilderMock({ getMany: [dependent] })
      repo.createQueryBuilder.mockReturnValue(qb as any)

      const result = await repository.findDependentsByResponsibleIds(['uuid-1'], CLINIC_ID)

      expect(qb.innerJoinAndSelect).toHaveBeenCalledWith('patient.user', 'user')
      expect(qb.where).toHaveBeenCalledWith('patient.responsible_patient_id IN (:...responsibleIds)', {
        responsibleIds: ['uuid-1'],
      })
      expect(qb.andWhere).toHaveBeenCalledWith('patient.clinic_id = :clinicId', { clinicId: CLINIC_ID })
      expect(result).toEqual([dependent])
    })
  })

  describe('findAll excludeDependents/excludeId filters', () => {
    it('applies excludeDependents and excludeId on the no-search path', async () => {
      const idsQb = makeQueryBuilderMock({ getMany: [] })
      const countQb = makeQueryBuilderMock({ getCount: 0 })
      let callCount = 0
      repo.createQueryBuilder.mockImplementation(() => {
        callCount++
        return callCount === 1 ? (idsQb as any) : (countQb as any)
      })

      await repository.findAll(1, 20, CLINIC_ID, undefined, true, 'exclude-uuid')

      expect(idsQb.andWhere).toHaveBeenCalledWith('patient.responsible_patient_id IS NULL')
      expect(idsQb.andWhere).toHaveBeenCalledWith('patient.id != :excludeId', { excludeId: 'exclude-uuid' })
      expect(countQb.andWhere).toHaveBeenCalledWith('patient.responsible_patient_id IS NULL')
      expect(countQb.andWhere).toHaveBeenCalledWith('patient.id != :excludeId', { excludeId: 'exclude-uuid' })
    })

    it('applies excludeDependents and excludeId on the name-search path', async () => {
      const idsQb = makeQueryBuilderMock({ getMany: [] })
      const countQb = makeQueryBuilderMock({ getCount: 0 })
      let callCount = 0
      repo.createQueryBuilder.mockImplementation(() => {
        callCount++
        return callCount === 1 ? (idsQb as any) : (countQb as any)
      })

      await repository.findAll(1, 20, CLINIC_ID, 'alice', true, 'exclude-uuid')

      expect(idsQb.andWhere).toHaveBeenCalledWith('patient.responsible_patient_id IS NULL')
      expect(idsQb.andWhere).toHaveBeenCalledWith('patient.id != :excludeId', { excludeId: 'exclude-uuid' })
    })

    it('applies excludeDependents and excludeId on the document-search path', async () => {
      const qb = makeQueryBuilderMock({ result: [[], 0] })
      repo.createQueryBuilder.mockReturnValue(qb as any)

      await repository.findAll(1, 20, CLINIC_ID, '12345678901', true, 'exclude-uuid')

      expect(qb.andWhere).toHaveBeenCalledWith('patient.responsible_patient_id IS NULL')
      expect(qb.andWhere).toHaveBeenCalledWith('patient.id != :excludeId', { excludeId: 'exclude-uuid' })
    })
  })

  describe('create', () => {
    it('saves patient and reloads with user relation', async () => {
      const data = {
        userId: 'user-uuid-1',
        clinicId: 'clinic-uuid-1',
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
