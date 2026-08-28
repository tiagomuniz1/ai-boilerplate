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
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IAppointmentsRepository } from '../repositories/appointments.repository.interface'
import { CompleteAppointmentUseCase } from '../use-cases/complete-appointment.use-case'

const CLINIC_ID = 'clinic-uuid'
const doctorUserId = faker.string.uuid()
const professionalId = faker.string.uuid()

const doctorUser: ICurrentUser = { id: doctorUserId, role: UserRole.PROFESSIONAL, clinicId: CLINIC_ID }
const adminUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }

const today = new Date().toISOString().split('T')[0]
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

const makeAppointment = (overrides = {}) => ({
  id: faker.string.uuid(),
  clinicId: CLINIC_ID,
  professionalId,
  patientId: faker.string.uuid(),
  specialtyId: null,
  scheduleId: faker.string.uuid(),
  date: yesterday,
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
  return { createQueryBuilder: jest.fn().mockReturnValue(builder) } as unknown as DataSource
}

describe('CompleteAppointmentUseCase', () => {
  let useCase: CompleteAppointmentUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new CompleteAppointmentUseCase(
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
    await expect(useCase.execute(faker.string.uuid(), doctorUser)).rejects.toThrow(NotFoundException)
  })

  it('throws ForbiddenException when DOCTOR tries to complete another doctor appointment', async () => {
    const appointment = makeAppointment({ professionalId: faker.string.uuid() })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    await expect(useCase.execute(appointment.id, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('throws UnprocessableEntityException when appointment is already CANCELLED', async () => {
    const appointment = makeAppointment({ status: AppointmentStatus.CANCELLED })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    await expect(useCase.execute(appointment.id, adminUser)).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws UnprocessableEntityException when appointment is already COMPLETED', async () => {
    const appointment = makeAppointment({ status: AppointmentStatus.COMPLETED })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    await expect(useCase.execute(appointment.id, adminUser)).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws UnprocessableEntityException when appointment is NO_SHOW', async () => {
    const appointment = makeAppointment({ status: AppointmentStatus.NO_SHOW })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    await expect(useCase.execute(appointment.id, adminUser)).rejects.toThrow(UnprocessableEntityException)
  })

  it('completes CONFIRMED appointment (regression: new allowed transition)', async () => {
    const appointment = makeAppointment({ date: yesterday, status: AppointmentStatus.CONFIRMED })
    const completed = makeAppointment({ date: yesterday, status: AppointmentStatus.COMPLETED })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    mockAppointmentsRepository.update.mockResolvedValue(completed as any)

    const result = await useCase.execute(appointment.id, adminUser)
    expect(result.status).toBe(AppointmentStatus.COMPLETED)
  })

  it('throws UnprocessableEntityException when appointment is in the future', async () => {
    const appointment = makeAppointment({ date: tomorrow })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    await expect(useCase.execute(appointment.id, adminUser)).rejects.toThrow(UnprocessableEntityException)
  })

  it('completes appointment for yesterday', async () => {
    const appointment = makeAppointment({ date: yesterday })
    const completed = makeAppointment({ date: yesterday, status: AppointmentStatus.COMPLETED })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    mockAppointmentsRepository.update.mockResolvedValue(completed as any)

    const result = await useCase.execute(appointment.id, adminUser)
    expect(result.status).toBe(AppointmentStatus.COMPLETED)
  })

  it('completes appointment for today', async () => {
    const appointment = makeAppointment({ date: today })
    const completed = makeAppointment({ date: today, status: AppointmentStatus.COMPLETED })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    mockAppointmentsRepository.update.mockResolvedValue(completed as any)

    const result = await useCase.execute(appointment.id, adminUser)
    expect(result.status).toBe(AppointmentStatus.COMPLETED)
  })

  it('DOCTOR can complete own past appointment', async () => {
    const appointment = makeAppointment({ date: yesterday })
    const completed = makeAppointment({ date: yesterday, status: AppointmentStatus.COMPLETED })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    mockAppointmentsRepository.update.mockResolvedValue(completed as any)

    const result = await useCase.execute(appointment.id, doctorUser)
    expect(result.status).toBe(AppointmentStatus.COMPLETED)
  })

  it('invalidates caches after completion', async () => {
    const appointment = makeAppointment({ date: yesterday })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    mockAppointmentsRepository.update.mockResolvedValue(makeAppointment({ status: AppointmentStatus.COMPLETED }) as any)

    await useCase.execute(appointment.id, adminUser)

    expect(mockCacheService.delByPrefix).toHaveBeenCalledWith(`appointments:list:${CLINIC_ID}:`)
    expect(mockCacheService.delByPrefix).toHaveBeenCalledWith(`appointments:availability:${CLINIC_ID}:${professionalId}:`)
    expect(mockCacheService.delByPrefix).toHaveBeenCalledWith(`dashboard:${CLINIC_ID}:`)
  })

  it('continues when cache invalidation fails', async () => {
    const appointment = makeAppointment({ date: yesterday })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    mockAppointmentsRepository.update.mockResolvedValue(makeAppointment({ status: AppointmentStatus.COMPLETED }) as any)
    mockCacheService.delByPrefix.mockRejectedValue(new Error('Redis error'))

    await expect(useCase.execute(appointment.id, adminUser)).resolves.toBeDefined()
  })

  it('throws ConflictException when OptimisticLockVersionMismatchError occurs', async () => {
    const appointment = makeAppointment({ date: yesterday })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    mockAppointmentsRepository.update.mockRejectedValue(new OptimisticLockVersionMismatchError('Appointment', 1, 2))

    await expect(useCase.execute(appointment.id, adminUser)).rejects.toThrow(ConflictException)
  })

  it('rethrows non-optimistic-lock errors from update', async () => {
    const appointment = makeAppointment({ date: yesterday })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    const dbError = new Error('DB connection lost')
    mockAppointmentsRepository.update.mockRejectedValue(dbError)

    await expect(useCase.execute(appointment.id, adminUser)).rejects.toThrow('DB connection lost')
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
    const useCaseEmpty = new CompleteAppointmentUseCase(
      emptyDataSource,
      mockAppointmentsRepository,
      mockProfessionalsRepository,
      mockCacheService,
    )

    const appointment = makeAppointment({ date: yesterday })
    const completed = makeAppointment({
      date: yesterday,
      status: AppointmentStatus.COMPLETED,
      specialtyId: 'spec-x',
    })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    mockAppointmentsRepository.update.mockResolvedValue(completed as any)

    const result = await useCaseEmpty.execute(appointment.id, adminUser)

    expect(result.professionalName).toBe('')
    expect(result.patientName).toBe('')
    expect(result.specialtyName).toBeNull()
  })

  it('resolves specialtyName when the completed appointment has a specialty', async () => {
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
    const useCaseWithSpecialty = new CompleteAppointmentUseCase(
      ds,
      mockAppointmentsRepository,
      mockProfessionalsRepository,
      mockCacheService,
    )

    const appointment = makeAppointment({ date: yesterday })
    const completed = makeAppointment({
      date: yesterday,
      status: AppointmentStatus.COMPLETED,
      specialtyId: 'spec-x',
    })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    mockAppointmentsRepository.update.mockResolvedValue(completed as any)

    const result = await useCaseWithSpecialty.execute(appointment.id, adminUser)

    expect(result.specialtyId).toBe('spec-x')
    expect(result.specialtyName).toBe('Cardiologia')
  })
})
