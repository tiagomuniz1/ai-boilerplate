import { faker } from '@faker-js/faker'
import { ScheduleException } from '../entities/schedule-exception.entity'
import { ScheduleExceptionsRepository } from './schedule-exceptions.repository'

const CLINIC_ID = 'clinic-uuid'

const makeException = (overrides = {}): ScheduleException =>
  ({
    id: faker.string.uuid(),
    clinicId: CLINIC_ID,
    professionalId: faker.string.uuid(),
    date: '2099-06-20',
    startTime: '08:00',
    endTime: '12:00',
    reason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as unknown as ScheduleException)

const makeQueryBuilder = () => {
  const qb: any = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  }
  return qb
}

const mockRepository = {
  createQueryBuilder: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  findOneByOrFail: jest.fn(),
  softDelete: jest.fn(),
}

describe('ScheduleExceptionsRepository', () => {
  let repository: ScheduleExceptionsRepository

  beforeEach(() => {
    jest.clearAllMocks()
    repository = new ScheduleExceptionsRepository(mockRepository as any)
  })

  describe('findAll', () => {
    it('returns paginated exceptions by clinicId without optional filters', async () => {
      const exceptions = [makeException()]
      const qb = makeQueryBuilder()
      qb.getManyAndCount.mockResolvedValue([exceptions, 1])
      mockRepository.createQueryBuilder.mockReturnValue(qb)

      const result = await repository.findAll({ page: 1, limit: 20 } as any, CLINIC_ID)

      expect(qb.andWhere).toHaveBeenCalledWith('exception.clinic_id = :clinicId', { clinicId: CLINIC_ID })
      expect(result).toEqual([exceptions, 1])
    })

    it('applies professionalId filter when provided', async () => {
      const professionalId = faker.string.uuid()
      const qb = makeQueryBuilder()
      qb.getManyAndCount.mockResolvedValue([[], 0])
      mockRepository.createQueryBuilder.mockReturnValue(qb)

      await repository.findAll({ page: 1, limit: 20, professionalId } as any, CLINIC_ID)

      expect(qb.andWhere).toHaveBeenCalledWith('exception.professional_id = :professionalId', { professionalId })
    })

    it('applies from/to date filters when provided', async () => {
      const qb = makeQueryBuilder()
      qb.getManyAndCount.mockResolvedValue([[], 0])
      mockRepository.createQueryBuilder.mockReturnValue(qb)

      await repository.findAll({ page: 1, limit: 20, from: '2099-06-01', to: '2099-06-30' } as any, CLINIC_ID)

      expect(qb.andWhere).toHaveBeenCalledWith('exception.date >= :from', { from: '2099-06-01' })
      expect(qb.andWhere).toHaveBeenCalledWith('exception.date <= :to', { to: '2099-06-30' })
    })

    it('applies correct pagination offset', async () => {
      const qb = makeQueryBuilder()
      qb.getManyAndCount.mockResolvedValue([[], 0])
      mockRepository.createQueryBuilder.mockReturnValue(qb)

      await repository.findAll({ page: 2, limit: 10 } as any, CLINIC_ID)

      expect(qb.skip).toHaveBeenCalledWith(10)
      expect(qb.take).toHaveBeenCalledWith(10)
    })

    it('uses default page=1 and limit=20 when not provided', async () => {
      const qb = makeQueryBuilder()
      qb.getManyAndCount.mockResolvedValue([[], 0])
      mockRepository.createQueryBuilder.mockReturnValue(qb)

      await repository.findAll({} as any, CLINIC_ID)

      expect(qb.skip).toHaveBeenCalledWith(0)
      expect(qb.take).toHaveBeenCalledWith(20)
    })
  })

  describe('findById', () => {
    it('returns exception when found', async () => {
      const exception = makeException()
      mockRepository.findOne.mockResolvedValue(exception)

      const result = await repository.findById(exception.id, CLINIC_ID)

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: exception.id, clinicId: CLINIC_ID } })
      expect(result).toBe(exception)
    })

    it('returns null when not found', async () => {
      mockRepository.findOne.mockResolvedValue(null)

      const result = await repository.findById(faker.string.uuid(), CLINIC_ID)

      expect(result).toBeNull()
    })
  })

  describe('findActiveByProfessionalAndDate', () => {
    it('returns exceptions by doctor and date', async () => {
      const professionalId = faker.string.uuid()
      const exception = makeException({ professionalId })
      mockRepository.find.mockResolvedValue([exception])

      const result = await repository.findActiveByProfessionalAndDate(professionalId, '2099-06-20', CLINIC_ID)

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { professionalId, date: '2099-06-20', clinicId: CLINIC_ID },
      })
      expect(result).toEqual([exception])
    })
  })

  describe('create', () => {
    it('creates and saves exception without queryRunner', async () => {
      const exception = makeException()
      mockRepository.create.mockReturnValue(exception)
      mockRepository.save.mockResolvedValue(exception)

      const data = { professionalId: exception.professionalId, clinicId: CLINIC_ID, date: '2099-06-20' }
      const result = await repository.create(data)

      expect(mockRepository.create).toHaveBeenCalledWith(data)
      expect(mockRepository.save).toHaveBeenCalledWith(exception)
      expect(result).toBe(exception)
    })

    it('uses queryRunner repo when provided', async () => {
      const exception = makeException()
      const qrRepo = { create: jest.fn().mockReturnValue(exception), save: jest.fn().mockResolvedValue(exception) }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as any

      const result = await repository.create({ professionalId: exception.professionalId }, queryRunner)

      expect(queryRunner.manager.getRepository).toHaveBeenCalledWith(ScheduleException)
      expect(result).toBe(exception)
    })
  })

  describe('update', () => {
    it('finds, merges, and saves exception without queryRunner', async () => {
      const exception = makeException()
      const updated = makeException({ reason: 'Férias' })
      mockRepository.findOneByOrFail.mockResolvedValue({ ...exception })
      mockRepository.save.mockResolvedValue(updated)

      const result = await repository.update(exception.id, { reason: 'Férias' })

      expect(mockRepository.findOneByOrFail).toHaveBeenCalledWith({ id: exception.id })
      expect(mockRepository.save).toHaveBeenCalled()
      expect(result).toBe(updated)
    })

    it('only merges defined fields (undefined values are ignored)', async () => {
      const exception = makeException({ startTime: '08:00', endTime: '12:00' })
      const saved: any[] = []
      mockRepository.findOneByOrFail.mockResolvedValue({ ...exception })
      mockRepository.save.mockImplementation((e) => { saved.push(e); return Promise.resolve(e) })

      await repository.update(exception.id, { reason: 'test' })

      expect(saved[0].startTime).toBe('08:00')
      expect(saved[0].endTime).toBe('12:00')
      expect(saved[0].reason).toBe('test')
    })

    it('uses queryRunner repo when provided', async () => {
      const exception = makeException()
      const qrRepo = {
        findOneByOrFail: jest.fn().mockResolvedValue({ ...exception }),
        save: jest.fn().mockResolvedValue(exception),
      }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as any

      await repository.update(exception.id, { reason: 'x' }, queryRunner)

      expect(queryRunner.manager.getRepository).toHaveBeenCalledWith(ScheduleException)
      expect(qrRepo.findOneByOrFail).toHaveBeenCalledWith({ id: exception.id })
    })
  })

  describe('delete', () => {
    it('soft-deletes exception without queryRunner', async () => {
      const id = faker.string.uuid()
      mockRepository.softDelete.mockResolvedValue({ affected: 1 })

      await repository.delete(id)

      expect(mockRepository.softDelete).toHaveBeenCalledWith(id)
    })

    it('uses queryRunner repo when provided', async () => {
      const id = faker.string.uuid()
      const qrRepo = { softDelete: jest.fn().mockResolvedValue({ affected: 1 }) }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as any

      await repository.delete(id, queryRunner)

      expect(queryRunner.manager.getRepository).toHaveBeenCalledWith(ScheduleException)
      expect(qrRepo.softDelete).toHaveBeenCalledWith(id)
    })
  })
})
