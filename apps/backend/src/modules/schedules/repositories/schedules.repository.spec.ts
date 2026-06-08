import { faker } from '@faker-js/faker'
import { DayOfWeek } from '@app/shared'
import { Schedule } from '../entities/schedule.entity'
import { SchedulesRepository } from './schedules.repository'

const CLINIC_ID = 'fixed-clinic-uuid'

const makeSchedule = (overrides = {}): Schedule =>
  ({
    id: faker.string.uuid(),
    doctorId: faker.string.uuid(),
    dayOfWeek: DayOfWeek.MONDAY,
    startTime: '08:00',
    endTime: '12:00',
    slotDurationInMinutes: 30,
    validFrom: null,
    validUntil: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as unknown as Schedule)

const makeQueryBuilder = () => ({
  innerJoin: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn(),
  getOne: jest.fn(),
})

const mockRepository = {
  createQueryBuilder: jest.fn(),
  findOneBy: jest.fn(),
  findOneByOrFail: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  softDelete: jest.fn(),
}

describe('SchedulesRepository', () => {
  let repository: SchedulesRepository

  beforeEach(() => {
    jest.clearAllMocks()
    repository = new SchedulesRepository(mockRepository as any)
  })

  describe('findAll', () => {
    it('returns schedules and count', async () => {
      const schedule = makeSchedule()
      const qb = makeQueryBuilder()
      qb.getManyAndCount.mockResolvedValue([[schedule], 1])
      mockRepository.createQueryBuilder.mockReturnValue(qb)

      const result = await repository.findAll({ page: 1, limit: 20 }, CLINIC_ID)

      expect(result[0]).toHaveLength(1)
      expect(result[1]).toBe(1)
      const andWhereCalls = qb.andWhere.mock.calls.map((c: any[]) => c[0])
      expect(andWhereCalls.some((c: string) => c.includes('clinic_id'))).toBe(true)
    })

    it('applies doctorId filter when provided', async () => {
      const doctorId = faker.string.uuid()
      const qb = makeQueryBuilder()
      qb.getManyAndCount.mockResolvedValue([[], 0])
      mockRepository.createQueryBuilder.mockReturnValue(qb)

      await repository.findAll({ page: 1, limit: 20, doctorId }, CLINIC_ID)

      const calls = qb.andWhere.mock.calls.map((c: any[]) => c[0])
      expect(calls.some((c: string) => c.includes('doctor_id'))).toBe(true)
    })

    it('applies validity filter only when activeOn is provided', async () => {
      const qbWithDate = makeQueryBuilder()
      qbWithDate.getManyAndCount.mockResolvedValue([[], 0])
      mockRepository.createQueryBuilder.mockReturnValueOnce(qbWithDate)

      await repository.findAll({ page: 1, limit: 20, activeOn: '2024-06-15' }, CLINIC_ID)

      const callsWithDate = qbWithDate.andWhere.mock.calls.map((c: any[]) => c[0])
      expect(callsWithDate.some((c: string) => c.includes('valid_from'))).toBe(true)
      expect(callsWithDate.some((c: string) => c.includes('valid_until'))).toBe(true)

      const qbNoDate = makeQueryBuilder()
      qbNoDate.getManyAndCount.mockResolvedValue([[], 0])
      mockRepository.createQueryBuilder.mockReturnValueOnce(qbNoDate)

      await repository.findAll({ page: 1, limit: 20 }, CLINIC_ID)

      const callsNoDate = qbNoDate.andWhere.mock.calls.map((c: any[]) => c[0])
      expect(callsNoDate.every((c: string) => !c.includes('valid_from'))).toBe(true)
      expect(callsNoDate.every((c: string) => !c.includes('valid_until'))).toBe(true)
    })

    it('applies dayOfWeek filter when provided', async () => {
      const qb = makeQueryBuilder()
      qb.getManyAndCount.mockResolvedValue([[], 0])
      mockRepository.createQueryBuilder.mockReturnValue(qb)

      await repository.findAll({ page: 1, limit: 20, dayOfWeek: DayOfWeek.FRIDAY }, CLINIC_ID)

      const calls = qb.andWhere.mock.calls.map((c: any[]) => c[0])
      expect(calls.some((c: string) => c.includes('day_of_week'))).toBe(true)
    })

    it('uses default page=1 limit=20 when not provided', async () => {
      const qb = makeQueryBuilder()
      qb.getManyAndCount.mockResolvedValue([[], 0])
      mockRepository.createQueryBuilder.mockReturnValue(qb)

      await repository.findAll({} as any, CLINIC_ID)

      expect(qb.skip).toHaveBeenCalledWith(0)
      expect(qb.take).toHaveBeenCalledWith(20)
    })
  })

  describe('findById', () => {
    it('returns schedule when found using queryBuilder with clinicId filter', async () => {
      const schedule = makeSchedule()
      const qb = makeQueryBuilder()
      qb.getOne.mockResolvedValue(schedule)
      mockRepository.createQueryBuilder.mockReturnValue(qb)

      const result = await repository.findById(schedule.id, CLINIC_ID)

      expect(result).toBe(schedule)
      expect(qb.where).toHaveBeenCalledWith('schedule.id = :id', { id: schedule.id })
      expect(qb.andWhere).toHaveBeenCalledWith('u.clinic_id = :clinicId', { clinicId: CLINIC_ID })
    })

    it('returns null when not found', async () => {
      const qb = makeQueryBuilder()
      qb.getOne.mockResolvedValue(null)
      mockRepository.createQueryBuilder.mockReturnValue(qb)

      const result = await repository.findById(faker.string.uuid(), CLINIC_ID)

      expect(result).toBeNull()
    })
  })

  describe('findOverlapping', () => {
    it('returns overlapping schedule when found', async () => {
      const schedule = makeSchedule()
      const qb = makeQueryBuilder()
      qb.getOne.mockResolvedValue(schedule)
      mockRepository.createQueryBuilder.mockReturnValue(qb)

      const result = await repository.findOverlapping(
        schedule.doctorId,
        DayOfWeek.MONDAY,
        '08:00',
        '12:00',
        null,
        null,
        CLINIC_ID,
      )

      expect(result).toBe(schedule)
    })

    it('applies validFrom/validUntil conditions when not null', async () => {
      const qb = makeQueryBuilder()
      qb.getOne.mockResolvedValue(null)
      mockRepository.createQueryBuilder.mockReturnValue(qb)

      await repository.findOverlapping(
        faker.string.uuid(),
        DayOfWeek.MONDAY,
        '08:00',
        '12:00',
        '2025-01-01',
        '2025-12-31',
        CLINIC_ID,
      )

      const calls = qb.andWhere.mock.calls.map((c: any[]) => c[0])
      expect(calls.some((c: string) => c.includes('valid_until'))).toBe(true)
      expect(calls.some((c: string) => c.includes('valid_from'))).toBe(true)
    })

    it('excludes given id when excludeId is provided', async () => {
      const excludeId = faker.string.uuid()
      const qb = makeQueryBuilder()
      qb.getOne.mockResolvedValue(null)
      mockRepository.createQueryBuilder.mockReturnValue(qb)

      await repository.findOverlapping(
        faker.string.uuid(),
        DayOfWeek.MONDAY,
        '08:00',
        '12:00',
        null,
        null,
        CLINIC_ID,
        excludeId,
      )

      const calls = qb.andWhere.mock.calls.map((c: any[]) => c[0])
      expect(calls.some((c: string) => c.includes('schedule.id != :excludeId'))).toBe(true)
    })
  })

  describe('create', () => {
    it('creates and saves a schedule', async () => {
      const schedule = makeSchedule()
      mockRepository.create.mockReturnValue(schedule)
      mockRepository.save.mockResolvedValue(schedule)

      const dto = {
        doctorId: schedule.doctorId,
        dayOfWeek: DayOfWeek.MONDAY,
        startTime: '08:00',
        endTime: '12:00',
        slotDurationInMinutes: 30,
      }

      const result = await repository.create(dto)

      expect(mockRepository.create).toHaveBeenCalled()
      expect(mockRepository.save).toHaveBeenCalledWith(schedule)
      expect(result).toBe(schedule)
    })

    it('uses queryRunner repo when provided', async () => {
      const schedule = makeSchedule()
      const mockQrRepo = {
        create: jest.fn().mockReturnValue(schedule),
        save: jest.fn().mockResolvedValue(schedule),
      }
      const mockQueryRunner = {
        manager: { getRepository: jest.fn().mockReturnValue(mockQrRepo) },
      }

      const dto = {
        doctorId: schedule.doctorId,
        dayOfWeek: DayOfWeek.MONDAY,
        startTime: '08:00',
        endTime: '12:00',
        slotDurationInMinutes: 30,
      }

      const result = await repository.create(dto, mockQueryRunner as any)

      expect(mockQueryRunner.manager.getRepository).toHaveBeenCalledWith(Schedule)
      expect(result).toBe(schedule)
    })
  })

  describe('update', () => {
    it('updates and saves a schedule', async () => {
      const schedule = makeSchedule()
      const updated = { ...schedule, startTime: '09:00' }
      mockRepository.findOneByOrFail.mockResolvedValue({ ...schedule })
      mockRepository.save.mockResolvedValue(updated as any)

      const result = await repository.update(schedule.id, { startTime: '09:00' })

      expect(mockRepository.findOneByOrFail).toHaveBeenCalledWith({ id: schedule.id })
      expect(mockRepository.save).toHaveBeenCalled()
      expect(result).toEqual(updated)
    })

    it('uses queryRunner repo when provided', async () => {
      const schedule = makeSchedule()
      const mockQrRepo = {
        findOneByOrFail: jest.fn().mockResolvedValue({ ...schedule }),
        save: jest.fn().mockResolvedValue(schedule),
      }
      const mockQueryRunner = {
        manager: { getRepository: jest.fn().mockReturnValue(mockQrRepo) },
      }

      const result = await repository.update(schedule.id, { startTime: '09:00' }, mockQueryRunner as any)

      expect(mockQueryRunner.manager.getRepository).toHaveBeenCalledWith(Schedule)
      expect(result).toBe(schedule)
    })

    it('allows null values to clear nullable fields', async () => {
      const schedule = makeSchedule({ validUntil: '2025-12-31' })
      const mutableSchedule = { ...schedule }
      mockRepository.findOneByOrFail.mockResolvedValue(mutableSchedule)
      mockRepository.save.mockResolvedValue({ ...mutableSchedule, validUntil: null } as any)

      await repository.update(schedule.id, { validUntil: null })

      expect(mutableSchedule.validUntil).toBeNull()
    })
  })

  describe('delete', () => {
    it('soft-deletes the schedule', async () => {
      mockRepository.softDelete.mockResolvedValue({ affected: 1 })

      await repository.delete('schedule-id')

      expect(mockRepository.softDelete).toHaveBeenCalledWith('schedule-id')
    })

    it('uses queryRunner repo when provided', async () => {
      const mockQrRepo = { softDelete: jest.fn().mockResolvedValue({ affected: 1 }) }
      const mockQueryRunner = {
        manager: { getRepository: jest.fn().mockReturnValue(mockQrRepo) },
      }

      await repository.delete('schedule-id', mockQueryRunner as any)

      expect(mockQueryRunner.manager.getRepository).toHaveBeenCalledWith(Schedule)
      expect(mockQrRepo.softDelete).toHaveBeenCalledWith('schedule-id')
    })
  })

  describe('deleteAllByDoctorId', () => {
    it('soft-deletes all schedules matching doctorId', async () => {
      const doctorId = 'doctor-uuid-1'
      mockRepository.softDelete.mockResolvedValue({ affected: 3 })

      await repository.deleteAllByDoctorId(doctorId, CLINIC_ID)

      expect(mockRepository.softDelete).toHaveBeenCalledWith({ doctorId })
    })

    it('uses queryRunner repo when provided', async () => {
      const doctorId = 'doctor-uuid-1'
      const mockQrRepo = { softDelete: jest.fn().mockResolvedValue({ affected: 2 }) }
      const mockQueryRunner = {
        manager: { getRepository: jest.fn().mockReturnValue(mockQrRepo) },
      }

      await repository.deleteAllByDoctorId(doctorId, CLINIC_ID, mockQueryRunner as any)

      expect(mockQueryRunner.manager.getRepository).toHaveBeenCalledWith(Schedule)
      expect(mockQrRepo.softDelete).toHaveBeenCalledWith({ doctorId })
    })
  })
})
