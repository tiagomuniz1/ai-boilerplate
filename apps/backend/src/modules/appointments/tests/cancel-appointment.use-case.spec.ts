import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { DataSource, OptimisticLockVersionMismatchError } from 'typeorm'
import { faker } from '@faker-js/faker'
import { AppointmentCancellationScope, AppointmentStatus, UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IAppointmentsRepository } from '../repositories/appointments.repository.interface'
import { CancelAppointmentUseCase } from '../use-cases/cancel-appointment.use-case'

const CLINIC_ID = 'clinic-uuid'
const doctorUserId = faker.string.uuid()
const professionalId = faker.string.uuid()

const doctorUser: ICurrentUser = { id: doctorUserId, role: UserRole.PROFESSIONAL, clinicId: CLINIC_ID }
const adminUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }

const makeAppointment = (overrides = {}) => ({
  id: faker.string.uuid(),
  clinicId: CLINIC_ID,
  professionalId,
  patientId: faker.string.uuid(),
  specialtyId: null,
  scheduleId: faker.string.uuid(),
  date: '2025-06-20',
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
})

const mockAppointmentsRepository: jest.Mocked<IAppointmentsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findActiveByProfessionalAndDate: jest.fn(),
  findActiveBySlot: jest.fn(),
  findActiveByDatesAndTime: jest.fn(),
  findBySeriesId: jest.fn(),
  findBySeriesIdFromDate: jest.fn(),
  countBySeriesIdAfterDate: jest.fn(),
  hasFutureByScheduleId: jest.fn(),
  hasFutureByProfessionalId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
}

const mockProfessionalsRepository: jest.Mocked<IProfessionalsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByRegistration: jest.fn(),
  countByClinic: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockCacheService = {
  delByPrefix: jest.fn(),
} as unknown as jest.Mocked<CacheService>

function makeMockDataSource(): DataSource {
  const builder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([{ fullName: 'Dr. Test' }]),
  }
  return {
    createQueryBuilder: jest.fn().mockReturnValue(builder),
    createQueryRunner: jest.fn().mockReturnValue({
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: { getRepository: jest.fn() },
    }),
  } as unknown as DataSource
}

describe('CancelAppointmentUseCase', () => {
  let useCase: CancelAppointmentUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new CancelAppointmentUseCase(
      makeMockDataSource(),
      mockAppointmentsRepository,
      mockProfessionalsRepository,
      mockCacheService,
    )
    mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: professionalId } as any)
    mockCacheService.delByPrefix.mockResolvedValue(undefined)
  })

  it('throws NotFoundException when appointment not found', async () => {
    mockAppointmentsRepository.findById.mockResolvedValue(null)
    await expect(useCase.execute(faker.string.uuid(), {}, doctorUser)).rejects.toThrow(NotFoundException)
  })

  it('throws ForbiddenException when DOCTOR tries to cancel another doctor appointment', async () => {
    const appointment = makeAppointment({ professionalId: faker.string.uuid() })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    await expect(useCase.execute(appointment.id, {}, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('throws UnprocessableEntityException when appointment is already CANCELLED', async () => {
    const appointment = makeAppointment({ status: AppointmentStatus.CANCELLED })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    await expect(useCase.execute(appointment.id, {}, adminUser)).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws UnprocessableEntityException when appointment is COMPLETED', async () => {
    const appointment = makeAppointment({ status: AppointmentStatus.COMPLETED })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    await expect(useCase.execute(appointment.id, {}, adminUser)).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws UnprocessableEntityException when appointment is NO_SHOW', async () => {
    const appointment = makeAppointment({ status: AppointmentStatus.NO_SHOW })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    await expect(useCase.execute(appointment.id, {}, adminUser)).rejects.toThrow(UnprocessableEntityException)
  })

  it('cancels CONFIRMED appointment', async () => {
    const appointment = makeAppointment({ status: AppointmentStatus.CONFIRMED })
    const cancelled = makeAppointment({ status: AppointmentStatus.CANCELLED })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    mockAppointmentsRepository.update.mockResolvedValue(cancelled as any)

    const result = await useCase.execute(appointment.id, {}, adminUser)
    expect(result.status).toBe(AppointmentStatus.CANCELLED)
  })

  it('cancels appointment and returns dto with cancellationReason', async () => {
    const appointment = makeAppointment()
    const cancelled = makeAppointment({ status: AppointmentStatus.CANCELLED, cancellationReason: 'Patient unavailable' })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    mockAppointmentsRepository.update.mockResolvedValue(cancelled as any)

    const result = await useCase.execute(appointment.id, { cancellationReason: 'Patient unavailable' }, adminUser)

    expect(result.status).toBe(AppointmentStatus.CANCELLED)
    expect(result.cancellationReason).toBe('Patient unavailable')
    expect(mockAppointmentsRepository.update).toHaveBeenCalledWith(appointment.id, {
      status: AppointmentStatus.CANCELLED,
      cancellationReason: 'Patient unavailable',
    })
  })

  it('DOCTOR can cancel own appointment', async () => {
    const appointment = makeAppointment()
    const cancelled = makeAppointment({ status: AppointmentStatus.CANCELLED })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    mockAppointmentsRepository.update.mockResolvedValue(cancelled as any)

    const result = await useCase.execute(appointment.id, {}, doctorUser)
    expect(result.status).toBe(AppointmentStatus.CANCELLED)
  })

  it('invalidates list and availability caches', async () => {
    const appointment = makeAppointment()
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    mockAppointmentsRepository.update.mockResolvedValue(makeAppointment({ status: AppointmentStatus.CANCELLED }) as any)

    await useCase.execute(appointment.id, {}, adminUser)

    expect(mockCacheService.delByPrefix).toHaveBeenCalledWith(`appointments:list:${CLINIC_ID}:`)
    expect(mockCacheService.delByPrefix).toHaveBeenCalledWith(`appointments:availability:${CLINIC_ID}:${professionalId}:`)
    expect(mockCacheService.delByPrefix).toHaveBeenCalledWith(`dashboard:${CLINIC_ID}:`)
  })

  it('continues when cache invalidation fails', async () => {
    const appointment = makeAppointment()
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    mockAppointmentsRepository.update.mockResolvedValue(makeAppointment({ status: AppointmentStatus.CANCELLED }) as any)
    mockCacheService.delByPrefix.mockRejectedValue(new Error('Redis error'))

    await expect(useCase.execute(appointment.id, {}, adminUser)).resolves.toBeDefined()
  })

  it('throws ConflictException when OptimisticLockVersionMismatchError occurs', async () => {
    const appointment = makeAppointment()
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    mockAppointmentsRepository.update.mockRejectedValue(new OptimisticLockVersionMismatchError('Appointment', 1, 2))

    await expect(useCase.execute(appointment.id, {}, adminUser)).rejects.toThrow(ConflictException)
  })

  it('rethrows non-optimistic-lock errors from update', async () => {
    const appointment = makeAppointment()
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    const dbError = new Error('DB connection lost')
    mockAppointmentsRepository.update.mockRejectedValue(dbError)

    await expect(useCase.execute(appointment.id, {}, adminUser)).rejects.toThrow('DB connection lost')
  })

  it('returns empty strings for professionalName and patientName when rows are empty', async () => {
    const emptyBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    }
    const emptyDataSource = { createQueryBuilder: jest.fn().mockReturnValue(emptyBuilder) } as unknown as DataSource
    const useCaseEmpty = new CancelAppointmentUseCase(
      emptyDataSource,
      mockAppointmentsRepository,
      mockProfessionalsRepository,
      mockCacheService,
    )

    const appointment = makeAppointment()
    const cancelled = makeAppointment({ status: AppointmentStatus.CANCELLED, specialtyId: 'spec-x' })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    mockAppointmentsRepository.update.mockResolvedValue(cancelled as any)

    const result = await useCaseEmpty.execute(appointment.id, {}, adminUser)

    expect(result.professionalName).toBe('')
    expect(result.patientName).toBe('')
    expect(result.specialtyName).toBeNull()
  })

  it('resolves specialtyName when the cancelled appointment has a specialty', async () => {
    const builder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([{ name: 'Cardiologia' }]),
    }
    const ds = { createQueryBuilder: jest.fn().mockReturnValue(builder) } as unknown as DataSource
    const useCaseWithSpecialty = new CancelAppointmentUseCase(
      ds,
      mockAppointmentsRepository,
      mockProfessionalsRepository,
      mockCacheService,
    )

    const appointment = makeAppointment()
    const cancelled = makeAppointment({ status: AppointmentStatus.CANCELLED, specialtyId: 'spec-x' })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    mockAppointmentsRepository.update.mockResolvedValue(cancelled as any)

    const result = await useCaseWithSpecialty.execute(appointment.id, {}, adminUser)

    expect(result.specialtyId).toBe('spec-x')
    expect(result.specialtyName).toBe('Cardiologia')
  })
  describe('cancellation scope', () => {
    const seriesId = faker.string.uuid()

    const makeSeriesAppointment = (date: string, sequence: number, overrides = {}) =>
      makeAppointment({ date, seriesId, seriesSequence: sequence, series: { createdOccurrenceCount: 4 }, ...overrides })

    it('defaults to the single occurrence when no scope is sent', async () => {
      const appointment = makeSeriesAppointment('2025-06-20', 2)
      mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
      mockAppointmentsRepository.update.mockResolvedValue(
        { ...appointment, status: AppointmentStatus.CANCELLED } as any,
      )

      const result = await useCase.execute(appointment.id, {}, adminUser)

      expect(mockAppointmentsRepository.findBySeriesIdFromDate).not.toHaveBeenCalled()
      expect(result.cancelledOccurrenceCount).toBe(1)
      expect(result.cancelledAppointmentIds).toEqual([appointment.id])
    })

    it('cancels only the chosen occurrence under SINGLE_OCCURRENCE', async () => {
      const appointment = makeSeriesAppointment('2025-06-20', 2)
      mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
      mockAppointmentsRepository.update.mockResolvedValue(
        { ...appointment, status: AppointmentStatus.CANCELLED } as any,
      )

      const result = await useCase.execute(
        appointment.id,
        { scope: AppointmentCancellationScope.SINGLE_OCCURRENCE },
        adminUser,
      )

      expect(mockAppointmentsRepository.update).toHaveBeenCalledTimes(1)
      expect(result.cancelledOccurrenceCount).toBe(1)
    })

    it('throws 422 when cancelling a series scope on a standalone appointment', async () => {
      mockAppointmentsRepository.findById.mockResolvedValue(makeAppointment() as any)

      await expect(
        useCase.execute(
          'id',
          { scope: AppointmentCancellationScope.THIS_AND_FUTURE_OCCURRENCES },
          adminUser,
        ),
      ).rejects.toThrow('Appointment does not belong to a recurring series')
      expect(mockAppointmentsRepository.update).not.toHaveBeenCalled()
    })

    it('cancels the occurrence and every later one in the series', async () => {
      const target = makeSeriesAppointment('2025-06-20', 2)
      const third = makeSeriesAppointment('2025-06-27', 3)
      const fourth = makeSeriesAppointment('2025-07-04', 4)
      mockAppointmentsRepository.findById.mockResolvedValue(target as any)
      mockAppointmentsRepository.findBySeriesIdFromDate.mockResolvedValue([target, third, fourth] as any)
      mockAppointmentsRepository.update.mockImplementation(async (id: string) => {
        const match = [target, third, fourth].find((candidate) => candidate.id === id)!
        return { ...match, status: AppointmentStatus.CANCELLED } as any
      })

      const result = await useCase.execute(
        target.id,
        {
          cancellationReason: 'Paciente desistiu do pacote',
          scope: AppointmentCancellationScope.THIS_AND_FUTURE_OCCURRENCES,
        },
        adminUser,
      )

      expect(mockAppointmentsRepository.findBySeriesIdFromDate).toHaveBeenCalledWith(
        seriesId,
        CLINIC_ID,
        target.date,
        [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
        expect.anything(),
      )
      expect(mockAppointmentsRepository.update).toHaveBeenCalledTimes(3)
      expect(mockAppointmentsRepository.update).toHaveBeenCalledWith(
        third.id,
        { status: AppointmentStatus.CANCELLED, cancellationReason: 'Paciente desistiu do pacote' },
        expect.anything(),
      )
      expect(result.cancelledOccurrenceCount).toBe(3)
      expect(result.cancelledAppointmentIds).toEqual([target.id, third.id, fourth.id])
      expect(result.id).toBe(target.id)
      expect(result.seriesTotalOccurrences).toBe(4)
    })

    it('falls back to the first cancelled occurrence when the target is not in the result set', async () => {
      const target = makeSeriesAppointment('2025-06-20', 2)
      const other = makeSeriesAppointment('2025-06-27', 3)
      mockAppointmentsRepository.findById.mockResolvedValue(target as any)
      mockAppointmentsRepository.findBySeriesIdFromDate.mockResolvedValue([other] as any)
      mockAppointmentsRepository.update.mockResolvedValue(
        { ...other, status: AppointmentStatus.CANCELLED } as any,
      )

      const result = await useCase.execute(
        target.id,
        { scope: AppointmentCancellationScope.THIS_AND_FUTURE_OCCURRENCES },
        adminUser,
      )

      expect(result.id).toBe(other.id)
    })

    it('rolls back and returns 409 when a sibling hits an optimistic lock mismatch', async () => {
      const target = makeSeriesAppointment('2025-06-20', 2)
      const third = makeSeriesAppointment('2025-06-27', 3)
      mockAppointmentsRepository.findById.mockResolvedValue(target as any)
      mockAppointmentsRepository.findBySeriesIdFromDate.mockResolvedValue([target, third] as any)
      mockAppointmentsRepository.update
        .mockResolvedValueOnce({ ...target, status: AppointmentStatus.CANCELLED } as any)
        .mockRejectedValueOnce(new OptimisticLockVersionMismatchError('Appointment', 1, 2))

      await expect(
        useCase.execute(
          target.id,
          { scope: AppointmentCancellationScope.THIS_AND_FUTURE_OCCURRENCES },
          adminUser,
        ),
      ).rejects.toThrow(ConflictException)
    })

    it('refuses a series cancellation for a professional who does not own it', async () => {
      const target = makeSeriesAppointment('2025-06-20', 2)
      mockAppointmentsRepository.findById.mockResolvedValue(target as any)
      mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: faker.string.uuid() } as any)

      await expect(
        useCase.execute(
          target.id,
          { scope: AppointmentCancellationScope.THIS_AND_FUTURE_OCCURRENCES },
          doctorUser,
        ),
      ).rejects.toThrow(ForbiddenException)
    })
  })
})
