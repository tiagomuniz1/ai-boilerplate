import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { AppointmentStatus, DayOfWeek, RecurrenceInterval, UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IAppointmentSeriesRepository } from '../repositories/appointment-series.repository.interface'
import { IAppointmentsRepository } from '../repositories/appointments.repository.interface'
import { FindAppointmentSeriesByIdUseCase } from '../use-cases/find-appointment-series-by-id.use-case'

const CLINIC_ID = 'clinic-uuid'
const doctorUserId = faker.string.uuid()
const professionalId = faker.string.uuid()
const patientId = faker.string.uuid()
const seriesId = faker.string.uuid()

const adminUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }
const doctorUser: ICurrentUser = { id: doctorUserId, role: UserRole.PROFESSIONAL, clinicId: CLINIC_ID }
const receptionistUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.USER, clinicId: CLINIC_ID }

const makeSeries = (overrides = {}) => ({
  id: seriesId,
  clinicId: CLINIC_ID,
  professionalId,
  patientId,
  specialtyId: null,
  recurrenceInterval: RecurrenceInterval.EVERY_TWO_WEEKS,
  dayOfWeek: DayOfWeek.TUESDAY,
  startTime: '09:00',
  anchorDate: '2099-06-16',
  requestedOccurrenceCount: 3,
  requestedUntilDate: null,
  createdOccurrenceCount: 3,
  createdByUserId: faker.string.uuid(),
  createdAt: new Date(),
  ...overrides,
})

const makeOccurrence = (date: string, sequence: number, overrides = {}) => ({
  id: faker.string.uuid(),
  clinicId: CLINIC_ID,
  professionalId,
  patientId,
  specialtyId: null,
  scheduleId: faker.string.uuid(),
  date,
  startTime: '09:00',
  endTime: '09:30',
  status: AppointmentStatus.SCHEDULED,
  insuranceType: null,
  reason: null,
  cancellationReason: null,
  seriesId,
  seriesSequence: sequence,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const mockSeriesRepository = {
  create: jest.fn(),
  findById: jest.fn(),
} as unknown as jest.Mocked<IAppointmentSeriesRepository>

const mockAppointmentsRepository = {
  findBySeriesId: jest.fn(),
} as unknown as jest.Mocked<IAppointmentsRepository>

const mockProfessionalsRepository = {
  findByUserId: jest.fn(),
} as unknown as jest.Mocked<IProfessionalsRepository>

function makeMockDataSource(rows: object[] = [{ fullName: 'Dr. Test' }]): DataSource {
  const builder = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rows),
  }
  return { createQueryBuilder: jest.fn().mockReturnValue(builder) } as unknown as DataSource
}

describe('FindAppointmentSeriesByIdUseCase', () => {
  let useCase: FindAppointmentSeriesByIdUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindAppointmentSeriesByIdUseCase(
      makeMockDataSource(),
      mockSeriesRepository,
      mockAppointmentsRepository,
      mockProfessionalsRepository,
    )
    mockSeriesRepository.findById.mockResolvedValue(makeSeries() as any)
    mockAppointmentsRepository.findBySeriesId.mockResolvedValue([
      makeOccurrence('2099-06-16', 1),
      makeOccurrence('2099-06-30', 2),
      makeOccurrence('2099-07-14', 3, { status: AppointmentStatus.CANCELLED }),
    ] as any)
    mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: professionalId } as any)
  })

  it('throws 404 when the series does not exist in the clinic', async () => {
    mockSeriesRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(seriesId, adminUser)).rejects.toThrow(NotFoundException)
  })

  it('returns the series with its occurrences for an admin', async () => {
    const result = await useCase.execute(seriesId, adminUser)

    expect(mockSeriesRepository.findById).toHaveBeenCalledWith(seriesId, CLINIC_ID)
    expect(result.id).toBe(seriesId)
    expect(result.recurrenceInterval).toBe(RecurrenceInterval.EVERY_TWO_WEEKS)
    expect(result.dayOfWeek).toBe(DayOfWeek.TUESDAY)
    expect(result.createdOccurrenceCount).toBe(3)
    expect(result.occurrences).toHaveLength(3)
    expect(result.occurrences.map((o) => o.seriesSequence)).toEqual([1, 2, 3])
    expect(result.occurrences.every((o) => o.seriesTotalOccurrences === 3)).toBe(true)
    expect(result.occurrences[2].status).toBe(AppointmentStatus.CANCELLED)
    expect(result.professionalName).toBe('Dr. Test')
  })

  it('lets a receptionist read the series', async () => {
    const result = await useCase.execute(seriesId, receptionistUser)

    expect(result.id).toBe(seriesId)
    expect(mockProfessionalsRepository.findByUserId).not.toHaveBeenCalled()
  })

  it('lets the owning professional read their own series', async () => {
    const result = await useCase.execute(seriesId, doctorUser)

    expect(result.id).toBe(seriesId)
  })

  it('refuses a professional reading a series that is not theirs', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: faker.string.uuid() } as any)

    await expect(useCase.execute(seriesId, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('refuses a user without a professional profile', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue(null)

    await expect(useCase.execute(seriesId, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('resolves the specialty name when the series has one', async () => {
    mockSeriesRepository.findById.mockResolvedValue(makeSeries({ specialtyId: 'spec-x' }) as any)
    const useCaseWithSpecialty = new FindAppointmentSeriesByIdUseCase(
      makeMockDataSource([{ fullName: 'Dr. Test', name: 'Fisioterapia' }]),
      mockSeriesRepository,
      mockAppointmentsRepository,
      mockProfessionalsRepository,
    )

    const result = await useCaseWithSpecialty.execute(seriesId, adminUser)

    expect(result.specialtyId).toBe('spec-x')
    expect(result.specialtyName).toBe('Fisioterapia')
  })

  it('returns a null specialty name when the specialty lookup finds no rows', async () => {
    mockSeriesRepository.findById.mockResolvedValue(makeSeries({ specialtyId: 'spec-x' }) as any)
    const useCaseWithoutSpecialty = new FindAppointmentSeriesByIdUseCase(
      makeMockDataSource([]),
      mockSeriesRepository,
      mockAppointmentsRepository,
      mockProfessionalsRepository,
    )

    const result = await useCaseWithoutSpecialty.execute(seriesId, adminUser)

    expect(result.specialtyId).toBe('spec-x')
    expect(result.specialtyName).toBeNull()
  })

  it('returns empty names when the lookup queries find no rows', async () => {
    const useCaseWithoutNames = new FindAppointmentSeriesByIdUseCase(
      makeMockDataSource([]),
      mockSeriesRepository,
      mockAppointmentsRepository,
      mockProfessionalsRepository,
    )

    const result = await useCaseWithoutNames.execute(seriesId, adminUser)

    expect(result.professionalName).toBe('')
    expect(result.patientName).toBe('')
    expect(result.specialtyName).toBeNull()
  })
})
