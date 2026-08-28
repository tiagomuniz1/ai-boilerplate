import { faker } from '@faker-js/faker'
import { DayOfWeek, RecurrenceInterval } from '@app/shared'
import { AppointmentSeries } from '../entities/appointment-series.entity'
import { AppointmentSeriesRepository } from './appointment-series.repository'
import { CreateAppointmentSeriesData } from './appointment-series.repository.interface'

const CLINIC_ID = 'clinic-uuid'

const makeCreateData = (overrides: Partial<CreateAppointmentSeriesData> = {}): CreateAppointmentSeriesData => ({
  clinicId: CLINIC_ID,
  professionalId: faker.string.uuid(),
  patientId: faker.string.uuid(),
  specialtyId: null,
  recurrenceInterval: RecurrenceInterval.EVERY_WEEK,
  dayOfWeek: DayOfWeek.TUESDAY,
  startTime: '09:00',
  anchorDate: '2099-06-16',
  requestedOccurrenceCount: 4,
  requestedUntilDate: null,
  createdOccurrenceCount: 4,
  createdByUserId: faker.string.uuid(),
  ...overrides,
})

const mockRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
}

describe('AppointmentSeriesRepository', () => {
  let repository: AppointmentSeriesRepository

  beforeEach(() => {
    jest.clearAllMocks()
    repository = new AppointmentSeriesRepository(mockRepository as any)
  })

  describe('create', () => {
    it('persists the series through the default repository', async () => {
      const data = makeCreateData()
      const entity = { id: faker.string.uuid(), ...data } as unknown as AppointmentSeries
      mockRepository.create.mockReturnValue(entity)
      mockRepository.save.mockResolvedValue(entity)

      const result = await repository.create(data)

      expect(mockRepository.create).toHaveBeenCalledWith(data)
      expect(mockRepository.save).toHaveBeenCalledWith(entity)
      expect(result).toBe(entity)
    })

    it('uses the queryRunner repository when provided', async () => {
      const data = makeCreateData()
      const entity = { id: faker.string.uuid() } as unknown as AppointmentSeries
      const qrRepo = {
        create: jest.fn().mockReturnValue(entity),
        save: jest.fn().mockResolvedValue(entity),
      }
      const queryRunner = { manager: { getRepository: jest.fn().mockReturnValue(qrRepo) } } as any

      const result = await repository.create(data, queryRunner)

      expect(queryRunner.manager.getRepository).toHaveBeenCalledWith(AppointmentSeries)
      expect(qrRepo.save).toHaveBeenCalledWith(entity)
      expect(mockRepository.save).not.toHaveBeenCalled()
      expect(result).toBe(entity)
    })
  })

  describe('findById', () => {
    it('scopes the lookup to the clinic', async () => {
      const id = faker.string.uuid()
      const entity = { id } as unknown as AppointmentSeries
      mockRepository.findOne.mockResolvedValue(entity)

      const result = await repository.findById(id, CLINIC_ID)

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id, clinicId: CLINIC_ID } })
      expect(result).toBe(entity)
    })

    it('returns null when the series does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null)

      expect(await repository.findById(faker.string.uuid(), CLINIC_ID)).toBeNull()
    })
  })
})
