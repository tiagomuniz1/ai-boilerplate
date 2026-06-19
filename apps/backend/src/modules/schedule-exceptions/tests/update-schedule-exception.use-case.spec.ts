import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { DataSource, OptimisticLockVersionMismatchError } from 'typeorm'
import { faker } from '@faker-js/faker'
import { UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IAppointmentsRepository } from '../repositories/appointments.repository.adapter'
import { IScheduleExceptionsRepository } from '../repositories/schedule-exceptions.repository.interface'
import { UpdateScheduleExceptionUseCase } from '../use-cases/update-schedule-exception.use-case'

const mockScheduleExceptionsRepository: jest.Mocked<IScheduleExceptionsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findActiveByDoctorAndDate: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockDoctorsRepository: jest.Mocked<IDoctorsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByCrmNumber: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockAppointmentsRepository: jest.Mocked<IAppointmentsRepository> = {
  findScheduledAppointmentsInWindow: jest.fn(),
}

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  delByPrefix: jest.fn(),
  delByPattern: jest.fn(),
  setIfNotExists: jest.fn(),
} as unknown as jest.Mocked<CacheService>

const CLINIC_ID = 'clinic-uuid'
const DOCTOR_ID = 'doctor-uuid'
const EXCEPTION_ID = 'exception-uuid'

const makeDoctor = (id = DOCTOR_ID) => ({ id } as any)

const makeException = (overrides = {}) => ({
  id: EXCEPTION_ID,
  clinicId: CLINIC_ID,
  doctorId: DOCTOR_ID,
  date: '2099-06-20',
  startTime: '14:00',
  endTime: '18:00',
  reason: null,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

const doctorUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.DOCTOR, clinicId: CLINIC_ID }
const adminUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }

describe('UpdateScheduleExceptionUseCase', () => {
  let useCase: UpdateScheduleExceptionUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new UpdateScheduleExceptionUseCase(
      {} as DataSource,
      mockScheduleExceptionsRepository,
      mockDoctorsRepository,
      mockAppointmentsRepository,
      mockCacheService,
    )
    mockCacheService.delByPrefix.mockResolvedValue(undefined)
    mockCacheService.del.mockResolvedValue(undefined)
    mockAppointmentsRepository.findScheduledAppointmentsInWindow.mockResolvedValue([])
  })

  it('throws NotFoundException when exception does not exist', async () => {
    mockScheduleExceptionsRepository.findById.mockResolvedValue(null)
    await expect(useCase.execute(EXCEPTION_ID, {}, adminUser)).rejects.toThrow(NotFoundException)
  })

  it('throws ForbiddenException when DOCTOR tries to update exception of another doctor', async () => {
    mockScheduleExceptionsRepository.findById.mockResolvedValue(makeException({ doctorId: 'other-doctor' }) as any)
    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor())
    await expect(useCase.execute(EXCEPTION_ID, {}, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('allows DOCTOR to update own exception', async () => {
    const exception = makeException()
    const updated = makeException({ reason: 'Updated reason' })
    mockScheduleExceptionsRepository.findById.mockResolvedValue(exception as any)
    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor())
    mockScheduleExceptionsRepository.update.mockResolvedValue(updated as any)

    const result = await useCase.execute(EXCEPTION_ID, { reason: 'Updated reason' }, doctorUser)
    expect(result.reason).toBe('Updated reason')
  })

  it('allows ADMIN to update exception of any doctor', async () => {
    const exception = makeException()
    const updated = makeException({ reason: 'ADMIN update' })
    mockScheduleExceptionsRepository.findById.mockResolvedValue(exception as any)
    mockScheduleExceptionsRepository.update.mockResolvedValue(updated as any)

    const result = await useCase.execute(EXCEPTION_ID, { reason: 'ADMIN update' }, adminUser)
    expect(result.reason).toBe('ADMIN update')
  })

  it('throws UnprocessableEntityException when merged startTime >= endTime', async () => {
    mockScheduleExceptionsRepository.findById.mockResolvedValue(makeException() as any)
    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor())
    await expect(useCase.execute(EXCEPTION_ID, { startTime: '18:00', endTime: '14:00' }, doctorUser)).rejects.toThrow(
      UnprocessableEntityException,
    )
  })

  it('throws ConflictException when appointment conflicts exist', async () => {
    mockScheduleExceptionsRepository.findById.mockResolvedValue(makeException() as any)
    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor())
    mockAppointmentsRepository.findScheduledAppointmentsInWindow.mockResolvedValue([
      { id: 'appt-1', startTime: '15:00', endTime: '15:30', patientName: 'Patient A' },
    ])

    await expect(useCase.execute(EXCEPTION_ID, {}, doctorUser)).rejects.toThrow(ConflictException)
    expect(mockScheduleExceptionsRepository.update).not.toHaveBeenCalled()
  })

  it('throws ConflictException on optimistic lock mismatch', async () => {
    mockScheduleExceptionsRepository.findById.mockResolvedValue(makeException() as any)
    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor())
    mockScheduleExceptionsRepository.update.mockRejectedValue(new OptimisticLockVersionMismatchError('', 1, 2))

    await expect(useCase.execute(EXCEPTION_ID, { reason: 'x' }, doctorUser)).rejects.toThrow(ConflictException)
  })

  it('preserves existing startTime when not provided in dto (undefined != null)', async () => {
    const exception = makeException({ startTime: '09:00', endTime: '12:00' })
    const updated = makeException({ startTime: '09:00', endTime: '12:00' })
    mockScheduleExceptionsRepository.findById.mockResolvedValue(exception as any)
    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor())
    mockScheduleExceptionsRepository.update.mockResolvedValue(updated as any)

    await useCase.execute(EXCEPTION_ID, { reason: 'test' }, doctorUser)

    expect(mockScheduleExceptionsRepository.update).toHaveBeenCalledWith(
      EXCEPTION_ID,
      expect.objectContaining({ startTime: '09:00', endTime: '12:00' }),
    )
  })

  it('sets reason to null when dto.reason is null', async () => {
    const exception = makeException({ reason: 'old reason' })
    const updated = makeException({ reason: null })
    mockScheduleExceptionsRepository.findById.mockResolvedValue(exception as any)
    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor())
    mockScheduleExceptionsRepository.update.mockResolvedValue(updated as any)

    const result = await useCase.execute(EXCEPTION_ID, { reason: null }, doctorUser)
    expect(result.reason).toBeNull()
  })

  it('invalidates availability for old and new date when date changes', async () => {
    const exception = makeException({ date: '2099-06-20' })
    const updated = makeException({ date: '2099-06-21' })
    mockScheduleExceptionsRepository.findById.mockResolvedValue(exception as any)
    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor())
    mockScheduleExceptionsRepository.update.mockResolvedValue(updated as any)

    await useCase.execute(EXCEPTION_ID, { date: '2099-06-21' }, doctorUser)

    expect(mockCacheService.del).toHaveBeenCalledWith(`appointments:availability:${CLINIC_ID}:${DOCTOR_ID}:2099-06-20`)
    expect(mockCacheService.del).toHaveBeenCalledWith(`appointments:availability:${CLINIC_ID}:${DOCTOR_ID}:2099-06-21`)
  })

  it('continues when cache invalidation fails', async () => {
    const exception = makeException()
    const updated = makeException()
    mockScheduleExceptionsRepository.findById.mockResolvedValue(exception as any)
    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor())
    mockScheduleExceptionsRepository.update.mockResolvedValue(updated as any)
    mockCacheService.delByPrefix.mockRejectedValue(new Error('Redis error'))

    const result = await useCase.execute(EXCEPTION_ID, { reason: 'x' }, doctorUser)
    expect(result.id).toBeDefined()
  })

  it('throws ConflictException when OptimisticLockVersionMismatchError occurs during update', async () => {
    const exception = makeException()
    mockScheduleExceptionsRepository.findById.mockResolvedValue(exception as any)
    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor())
    mockAppointmentsRepository.findScheduledAppointmentsInWindow.mockResolvedValue([])
    mockScheduleExceptionsRepository.update.mockRejectedValue(
      new OptimisticLockVersionMismatchError('ScheduleException', 1, 2),
    )

    await expect(useCase.execute(EXCEPTION_ID, { reason: 'x' }, adminUser)).rejects.toThrow(ConflictException)
  })

  it('rethrows non-optimistic-lock errors from update', async () => {
    const exception = makeException()
    mockScheduleExceptionsRepository.findById.mockResolvedValue(exception as any)
    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor())
    mockAppointmentsRepository.findScheduledAppointmentsInWindow.mockResolvedValue([])
    const dbError = new Error('DB connection lost')
    mockScheduleExceptionsRepository.update.mockRejectedValue(dbError)

    await expect(useCase.execute(EXCEPTION_ID, { reason: 'x' }, adminUser)).rejects.toThrow('DB connection lost')
  })
})
