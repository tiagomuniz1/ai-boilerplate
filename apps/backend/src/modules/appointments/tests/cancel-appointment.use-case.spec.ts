import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { DataSource, OptimisticLockVersionMismatchError } from 'typeorm'
import { faker } from '@faker-js/faker'
import { AppointmentStatus, UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { IAppointmentsRepository } from '../repositories/appointments.repository.interface'
import { CancelAppointmentUseCase } from '../use-cases/cancel-appointment.use-case'

const CLINIC_ID = 'clinic-uuid'
const doctorUserId = faker.string.uuid()
const doctorId = faker.string.uuid()

const doctorUser: ICurrentUser = { id: doctorUserId, role: UserRole.DOCTOR, clinicId: CLINIC_ID }
const adminUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }

const makeAppointment = (overrides = {}) => ({
  id: faker.string.uuid(),
  clinicId: CLINIC_ID,
  doctorId,
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
  findActiveByDoctorAndDate: jest.fn(),
  findActiveBySlot: jest.fn(),
  hasFutureByScheduleId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
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
  return { createQueryBuilder: jest.fn().mockReturnValue(builder) } as unknown as DataSource
}

describe('CancelAppointmentUseCase', () => {
  let useCase: CancelAppointmentUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new CancelAppointmentUseCase(
      makeMockDataSource(),
      mockAppointmentsRepository,
      mockDoctorsRepository,
      mockCacheService,
    )
    mockDoctorsRepository.findByUserId.mockResolvedValue({ id: doctorId } as any)
    mockCacheService.delByPrefix.mockResolvedValue(undefined)
  })

  it('throws NotFoundException when appointment not found', async () => {
    mockAppointmentsRepository.findById.mockResolvedValue(null)
    await expect(useCase.execute(faker.string.uuid(), {}, doctorUser)).rejects.toThrow(NotFoundException)
  })

  it('throws ForbiddenException when DOCTOR tries to cancel another doctor appointment', async () => {
    const appointment = makeAppointment({ doctorId: faker.string.uuid() })
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
    expect(mockCacheService.delByPrefix).toHaveBeenCalledWith(`appointments:availability:${CLINIC_ID}:${doctorId}:`)
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

  it('returns empty strings for doctorName and patientName when rows are empty', async () => {
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
      mockDoctorsRepository,
      mockCacheService,
    )

    const appointment = makeAppointment()
    const cancelled = makeAppointment({ status: AppointmentStatus.CANCELLED, specialtyId: 'spec-x' })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    mockAppointmentsRepository.update.mockResolvedValue(cancelled as any)

    const result = await useCaseEmpty.execute(appointment.id, {}, adminUser)

    expect(result.doctorName).toBe('')
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
      mockDoctorsRepository,
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
})
