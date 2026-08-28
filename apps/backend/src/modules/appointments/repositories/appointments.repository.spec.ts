import { faker } from '@faker-js/faker'
import { In } from 'typeorm'
import { AppointmentStatus } from '@app/shared'
import { Appointment } from '../entities/appointment.entity'
import { AppointmentsRepository } from './appointments.repository'

const CLINIC_ID = 'clinic-uuid'

const makeAppointment = (overrides = {}): Appointment =>
  ({
    id: faker.string.uuid(),
    clinicId: CLINIC_ID,
    professionalId: faker.string.uuid(),
    patientId: faker.string.uuid(),
    scheduleId: faker.string.uuid(),
    date: '2099-06-20',
    startTime: '08:00',
    endTime: '08:30',
    status: AppointmentStatus.SCHEDULED,
    reason: null,
    cancellationReason: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as unknown as Appointment)

const makeQueryBuilder = () => {
  const qb: any = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getCount: jest.fn(),
    getMany: jest.fn(),
    getManyAndCount: jest.fn(),
  }
  return qb
}

const mockRepository = {
  createQueryBuilder: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  count: jest.fn(),
  findOneByOrFail: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
}

describe('AppointmentsRepository', () => {
  let repository: AppointmentsRepository

  beforeEach(() => {
    jest.clearAllMocks()
    repository = new AppointmentsRepository(mockRepository as any)
  })

  describe('findAll', () => {
    it('returns appointments filtered by clinicId without optional filters', async () => {
      const appointments = [makeAppointment()]
      const qb = makeQueryBuilder()
      qb.getManyAndCount.mockResolvedValue([appointments, 1])
      mockRepository.createQueryBuilder.mockReturnValue(qb)

      const result = await repository.findAll({ page: 1, limit: 20 } as any, CLINIC_ID)

      expect(qb.andWhere).toHaveBeenCalledWith('appointment.clinic_id = :clinicId', { clinicId: CLINIC_ID })
      expect(result).toEqual([appointments, 1])
    })

    it('applies professionalId filter when provided', async () => {
      const professionalId = faker.string.uuid()
      const qb = makeQueryBuilder()
      qb.getManyAndCount.mockResolvedValue([[], 0])
      mockRepository.createQueryBuilder.mockReturnValue(qb)

      await repository.findAll({ page: 1, limit: 20, professionalId } as any, CLINIC_ID)

      expect(qb.andWhere).toHaveBeenCalledWith('appointment.professional_id = :professionalId', { professionalId })
    })

    it('applies patientId filter when provided', async () => {
      const patientId = faker.string.uuid()
      const qb = makeQueryBuilder()
      qb.getManyAndCount.mockResolvedValue([[], 0])
      mockRepository.createQueryBuilder.mockReturnValue(qb)

      await repository.findAll({ page: 1, limit: 20, patientId } as any, CLINIC_ID)

      expect(qb.andWhere).toHaveBeenCalledWith('appointment.patient_id = :patientId', { patientId })
    })

    it('applies status filter when provided', async () => {
      const qb = makeQueryBuilder()
      qb.getManyAndCount.mockResolvedValue([[], 0])
      mockRepository.createQueryBuilder.mockReturnValue(qb)

      await repository.findAll({ page: 1, limit: 20, status: AppointmentStatus.CANCELLED } as any, CLINIC_ID)

      expect(qb.andWhere).toHaveBeenCalledWith('appointment.status = :status', { status: AppointmentStatus.CANCELLED })
    })

    it('applies from/to date filters when provided', async () => {
      const qb = makeQueryBuilder()
      qb.getManyAndCount.mockResolvedValue([[], 0])
      mockRepository.createQueryBuilder.mockReturnValue(qb)

      await repository.findAll({ page: 1, limit: 20, from: '2099-06-01', to: '2099-06-30' } as any, CLINIC_ID)

      expect(qb.andWhere).toHaveBeenCalledWith('appointment.date >= :from', { from: '2099-06-01' })
      expect(qb.andWhere).toHaveBeenCalledWith('appointment.date <= :to', { to: '2099-06-30' })
    })

    it('applies correct pagination offset', async () => {
      const qb = makeQueryBuilder()
      qb.getManyAndCount.mockResolvedValue([[], 0])
      mockRepository.createQueryBuilder.mockReturnValue(qb)

      await repository.findAll({ page: 3, limit: 10 } as any, CLINIC_ID)

      expect(qb.skip).toHaveBeenCalledWith(20)
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
    it('returns appointment by id and clinicId', async () => {
      const appointment = makeAppointment()
      mockRepository.findOne.mockResolvedValue(appointment)

      const result = await repository.findById(appointment.id, CLINIC_ID)

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: appointment.id, clinicId: CLINIC_ID },
        relations: ['series'],
      })
      expect(result).toBe(appointment)
    })

    it('returns null when not found', async () => {
      mockRepository.findOne.mockResolvedValue(null)

      const result = await repository.findById(faker.string.uuid(), CLINIC_ID)

      expect(result).toBeNull()
    })
  })

  describe('findActiveByProfessionalAndDate', () => {
    it('returns scheduled appointments by doctor and date', async () => {
      const professionalId = faker.string.uuid()
      const appointment = makeAppointment({ professionalId })
      mockRepository.find.mockResolvedValue([appointment])

      const result = await repository.findActiveByProfessionalAndDate(professionalId, '2099-06-20', CLINIC_ID)

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          professionalId,
          date: '2099-06-20',
          clinicId: CLINIC_ID,
          status: In([AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED]),
        },
      })
      expect(result).toEqual([appointment])
    })
  })

  describe('findActiveBySlot', () => {
    it('returns scheduled appointment by slot without queryRunner', async () => {
      const professionalId = faker.string.uuid()
      const appointment = makeAppointment({ professionalId })
      mockRepository.findOne.mockResolvedValue(appointment)

      const result = await repository.findActiveBySlot(professionalId, '2099-06-20', '08:00', CLINIC_ID)

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          professionalId,
          date: '2099-06-20',
          startTime: '08:00',
          clinicId: CLINIC_ID,
          status: In([AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED]),
        },
      })
      expect(result).toBe(appointment)
    })

    it('uses queryRunner repo when provided', async () => {
      const professionalId = faker.string.uuid()
      const appointment = makeAppointment({ professionalId })
      const qrRepo = { findOne: jest.fn().mockResolvedValue(appointment) }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as any

      const result = await repository.findActiveBySlot(professionalId, '2099-06-20', '08:00', CLINIC_ID, queryRunner)

      expect(queryRunner.manager.getRepository).toHaveBeenCalledWith(Appointment)
      expect(qrRepo.findOne).toHaveBeenCalled()
      expect(result).toBe(appointment)
    })
  })

  describe('findActiveByDatesAndTime', () => {
    it('returns an empty list without querying when there are no dates', async () => {
      const result = await repository.findActiveByDatesAndTime(faker.string.uuid(), CLINIC_ID, [], '08:00')

      expect(result).toEqual([])
      expect(mockRepository.find).not.toHaveBeenCalled()
    })

    it('matches every date at the same start time in a single query', async () => {
      const professionalId = faker.string.uuid()
      const appointment = makeAppointment({ professionalId })
      mockRepository.find.mockResolvedValue([appointment])

      const result = await repository.findActiveByDatesAndTime(
        professionalId,
        CLINIC_ID,
        ['2099-06-20', '2099-06-27'],
        '08:00',
      )

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          professionalId,
          clinicId: CLINIC_ID,
          startTime: '08:00',
          date: In(['2099-06-20', '2099-06-27']),
          status: In([AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED]),
        },
        order: { date: 'ASC' },
      })
      expect(result).toEqual([appointment])
    })

    it('uses the queryRunner repository when provided', async () => {
      const appointment = makeAppointment()
      const qrRepo = { find: jest.fn().mockResolvedValue([appointment]) }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as any

      const result = await repository.findActiveByDatesAndTime(
        faker.string.uuid(),
        CLINIC_ID,
        ['2099-06-20'],
        '08:00',
        queryRunner,
      )

      expect(qrRepo.find).toHaveBeenCalled()
      expect(mockRepository.find).not.toHaveBeenCalled()
      expect(result).toEqual([appointment])
    })
  })

  describe('findBySeriesId', () => {
    it('returns every occurrence of the series ordered by date', async () => {
      const seriesId = faker.string.uuid()
      const appointment = makeAppointment({ seriesId })
      mockRepository.find.mockResolvedValue([appointment])

      const result = await repository.findBySeriesId(seriesId, CLINIC_ID)

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { seriesId, clinicId: CLINIC_ID },
        relations: ['series'],
        order: { date: 'ASC' },
      })
      expect(result).toEqual([appointment])
    })
  })

  describe('findBySeriesIdFromDate', () => {
    it('returns occurrences on or after the given date for the given statuses', async () => {
      const seriesId = faker.string.uuid()
      const appointment = makeAppointment({ seriesId })
      const qb = makeQueryBuilder()
      qb.getMany.mockResolvedValue([appointment])
      mockRepository.createQueryBuilder.mockReturnValue(qb)

      const result = await repository.findBySeriesIdFromDate(seriesId, CLINIC_ID, '2099-06-20', [
        AppointmentStatus.SCHEDULED,
        AppointmentStatus.CONFIRMED,
      ])

      expect(qb.where).toHaveBeenCalledWith('appointment.series_id = :seriesId', { seriesId })
      expect(qb.andWhere).toHaveBeenCalledWith('appointment.date >= :fromDate', { fromDate: '2099-06-20' })
      expect(qb.andWhere).toHaveBeenCalledWith('appointment.status IN (:...statuses)', {
        statuses: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
      })
      expect(result).toEqual([appointment])
    })

    it('uses the queryRunner repository when provided', async () => {
      const qb = makeQueryBuilder()
      qb.getMany.mockResolvedValue([])
      const qrRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb) }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as any

      await repository.findBySeriesIdFromDate(faker.string.uuid(), CLINIC_ID, '2099-06-20', [], queryRunner)

      expect(qrRepo.createQueryBuilder).toHaveBeenCalled()
      expect(mockRepository.createQueryBuilder).not.toHaveBeenCalled()
    })
  })

  describe('countBySeriesIdAfterDate', () => {
    it('counts occurrences strictly after the given date', async () => {
      const seriesId = faker.string.uuid()
      const qb = makeQueryBuilder()
      qb.getCount.mockResolvedValue(4)
      mockRepository.createQueryBuilder.mockReturnValue(qb)

      const result = await repository.countBySeriesIdAfterDate(seriesId, CLINIC_ID, '2099-06-20', [
        AppointmentStatus.SCHEDULED,
      ])

      expect(qb.andWhere).toHaveBeenCalledWith('appointment.date > :afterDate', { afterDate: '2099-06-20' })
      expect(result).toBe(4)
    })
  })

  describe('hasFutureByScheduleId', () => {
    it('returns false immediately when count is 0', async () => {
      const scheduleId = faker.string.uuid()
      mockRepository.count.mockResolvedValue(0)

      const result = await repository.hasFutureByScheduleId(scheduleId, CLINIC_ID)

      expect(result).toBe(false)
      expect(mockRepository.createQueryBuilder).not.toHaveBeenCalled()
    })

    it('returns true when there are future scheduled appointments', async () => {
      const scheduleId = faker.string.uuid()
      mockRepository.count.mockResolvedValue(2)
      const qb = makeQueryBuilder()
      qb.getCount.mockResolvedValue(1)
      mockRepository.createQueryBuilder.mockReturnValue(qb)

      const result = await repository.hasFutureByScheduleId(scheduleId, CLINIC_ID)

      expect(result).toBe(true)
    })

    it('returns false when count > 0 but no future appointments', async () => {
      const scheduleId = faker.string.uuid()
      mockRepository.count.mockResolvedValue(2)
      const qb = makeQueryBuilder()
      qb.getCount.mockResolvedValue(0)
      mockRepository.createQueryBuilder.mockReturnValue(qb)

      const result = await repository.hasFutureByScheduleId(scheduleId, CLINIC_ID)

      expect(result).toBe(false)
    })

    // A confirmed appointment is more reason to block deleting the schedule, not
    // less — the guard used to look at 'scheduled' alone and would have let it go.
    it('counts confirmed appointments, not only scheduled ones', async () => {
      const scheduleId = faker.string.uuid()
      mockRepository.count.mockResolvedValue(1)
      const qb = makeQueryBuilder()
      qb.getCount.mockResolvedValue(1)
      mockRepository.createQueryBuilder.mockReturnValue(qb)

      await repository.hasFutureByScheduleId(scheduleId, CLINIC_ID)

      expect(mockRepository.count).toHaveBeenCalledWith({
        where: {
          scheduleId,
          clinicId: CLINIC_ID,
          status: In([AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED]),
        },
      })
      expect(qb.andWhere).toHaveBeenCalledWith('appointment.status IN (:...activeStatuses)', {
        activeStatuses: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
      })
    })
  })

  describe('hasFutureByProfessionalId', () => {
    it('returns true when a future scheduled appointment exists for the professional', async () => {
      const professionalId = faker.string.uuid()
      const qb = makeQueryBuilder()
      qb.getCount.mockResolvedValue(1)
      mockRepository.createQueryBuilder.mockReturnValue(qb)

      const result = await repository.hasFutureByProfessionalId(professionalId, CLINIC_ID)

      expect(result).toBe(true)
      expect(qb.where).toHaveBeenCalledWith('appointment.professional_id = :professionalId', { professionalId })
    })

    it('returns false when there are no future scheduled appointments', async () => {
      const qb = makeQueryBuilder()
      qb.getCount.mockResolvedValue(0)
      mockRepository.createQueryBuilder.mockReturnValue(qb)

      expect(await repository.hasFutureByProfessionalId(faker.string.uuid(), CLINIC_ID)).toBe(false)
    })

    it('counts confirmed appointments, not only scheduled ones', async () => {
      const qb = makeQueryBuilder()
      qb.getCount.mockResolvedValue(1)
      mockRepository.createQueryBuilder.mockReturnValue(qb)

      await repository.hasFutureByProfessionalId(faker.string.uuid(), CLINIC_ID)

      expect(qb.andWhere).toHaveBeenCalledWith('appointment.status IN (:...activeStatuses)', {
        activeStatuses: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
      })
    })
  })

  describe('create', () => {
    it('creates and saves appointment without queryRunner', async () => {
      const appointment = makeAppointment()
      mockRepository.create.mockReturnValue(appointment)
      mockRepository.save.mockResolvedValue(appointment)

      const data = {
        clinicId: CLINIC_ID,
        professionalId: faker.string.uuid(),
        patientId: faker.string.uuid(),
        specialtyId: null,
        scheduleId: faker.string.uuid(),
        date: '2099-06-20',
        startTime: '08:00',
        endTime: '08:30',
        reason: null,
      }

      const result = await repository.create(data)

      expect(mockRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        status: AppointmentStatus.SCHEDULED,
        date: data.date,
        startTime: data.startTime,
      }))
      expect(mockRepository.save).toHaveBeenCalledWith(appointment)
      expect(result).toBe(appointment)
    })

    it('uses queryRunner repo when provided', async () => {
      const appointment = makeAppointment()
      const qrRepo = { create: jest.fn().mockReturnValue(appointment), save: jest.fn().mockResolvedValue(appointment) }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as any

      const data = {
        clinicId: CLINIC_ID,
        professionalId: faker.string.uuid(),
        patientId: faker.string.uuid(),
        specialtyId: null,
        scheduleId: faker.string.uuid(),
        date: '2099-06-20',
        startTime: '08:00',
        endTime: '08:30',
        reason: null,
      }

      const result = await repository.create(data, queryRunner)

      expect(queryRunner.manager.getRepository).toHaveBeenCalledWith(Appointment)
      expect(qrRepo.create).toHaveBeenCalled()
      expect(qrRepo.save).toHaveBeenCalled()
      expect(result).toBe(appointment)
    })
  })

  describe('update', () => {
    it('updates appointment status without queryRunner', async () => {
      const appointment = makeAppointment()
      mockRepository.findOneByOrFail.mockResolvedValue({ ...appointment })
      mockRepository.save.mockResolvedValue({ ...appointment, status: AppointmentStatus.CANCELLED })

      const result = await repository.update(appointment.id, { status: AppointmentStatus.CANCELLED })

      expect(mockRepository.findOneByOrFail).toHaveBeenCalledWith({ id: appointment.id })
      expect(mockRepository.save).toHaveBeenCalled()
      expect(result.status).toBe(AppointmentStatus.CANCELLED)
    })

    it('updates cancellationReason', async () => {
      const appointment = makeAppointment()
      const updated = { ...appointment, status: AppointmentStatus.CANCELLED, cancellationReason: 'test reason' }
      mockRepository.findOneByOrFail.mockResolvedValue({ ...appointment })
      mockRepository.save.mockResolvedValue(updated)

      const result = await repository.update(appointment.id, {
        status: AppointmentStatus.CANCELLED,
        cancellationReason: 'test reason',
      })

      expect(result.cancellationReason).toBe('test reason')
    })

    it('uses queryRunner repo when provided', async () => {
      const appointment = makeAppointment()
      const qrRepo = {
        findOneByOrFail: jest.fn().mockResolvedValue({ ...appointment }),
        save: jest.fn().mockResolvedValue({ ...appointment, status: AppointmentStatus.COMPLETED }),
      }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as any

      const result = await repository.update(appointment.id, { status: AppointmentStatus.COMPLETED }, queryRunner)

      expect(queryRunner.manager.getRepository).toHaveBeenCalledWith(Appointment)
      expect(qrRepo.findOneByOrFail).toHaveBeenCalledWith({ id: appointment.id })
      expect(result.status).toBe(AppointmentStatus.COMPLETED)
    })

    it('reassigns professionalId, scheduleId and endTime', async () => {
      const appointment = makeAppointment()
      const saved = { ...appointment }
      mockRepository.findOneByOrFail.mockResolvedValue(saved)
      mockRepository.save.mockImplementation(async (entity) => entity as any)

      const result = await repository.update(appointment.id, {
        professionalId: 'new-professional',
        scheduleId: 'new-schedule',
        endTime: '09:30',
      })

      expect(result.professionalId).toBe('new-professional')
      expect(result.scheduleId).toBe('new-schedule')
      expect(result.endTime).toBe('09:30')
    })
  })
})
