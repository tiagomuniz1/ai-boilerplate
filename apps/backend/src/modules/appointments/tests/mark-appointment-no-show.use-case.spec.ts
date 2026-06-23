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
import { MarkAppointmentNoShowUseCase } from '../use-cases/mark-appointment-no-show.use-case'

const CLINIC_ID = 'clinic-uuid'
const doctorUserId = faker.string.uuid()
const doctorId = faker.string.uuid()

const doctorUser: ICurrentUser = { id: doctorUserId, role: UserRole.DOCTOR, clinicId: CLINIC_ID }
const adminUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }

const yesterday = (() => {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().split('T')[0]
})()

const tomorrow = (() => {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().split('T')[0]
})()

const makeAppointment = (overrides = {}) => ({
  id: faker.string.uuid(),
  clinicId: CLINIC_ID,
  doctorId,
  patientId: faker.string.uuid(),
  specialtyId: null,
  scheduleId: faker.string.uuid(),
  date: yesterday,
  startTime: '08:00',
  endTime: '08:30',
  status: AppointmentStatus.SCHEDULED,
  insuranceType: null,
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

describe('MarkAppointmentNoShowUseCase', () => {
  let useCase: MarkAppointmentNoShowUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new MarkAppointmentNoShowUseCase(
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
    await expect(useCase.execute(faker.string.uuid(), adminUser)).rejects.toThrow(NotFoundException)
  })

  it('throws ForbiddenException when DOCTOR tries to mark another doctor appointment', async () => {
    const appointment = makeAppointment({ doctorId: faker.string.uuid() })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    await expect(useCase.execute(appointment.id, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('marks SCHEDULED appointment as no-show', async () => {
    const appointment = makeAppointment({ status: AppointmentStatus.SCHEDULED })
    const noShow = makeAppointment({ status: AppointmentStatus.NO_SHOW })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    mockAppointmentsRepository.update.mockResolvedValue(noShow as any)

    const result = await useCase.execute(appointment.id, adminUser)

    expect(result.status).toBe(AppointmentStatus.NO_SHOW)
    expect(mockAppointmentsRepository.update).toHaveBeenCalledWith(appointment.id, {
      status: AppointmentStatus.NO_SHOW,
    })
  })

  it('marks CONFIRMED appointment as no-show', async () => {
    const appointment = makeAppointment({ status: AppointmentStatus.CONFIRMED })
    const noShow = makeAppointment({ status: AppointmentStatus.NO_SHOW })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    mockAppointmentsRepository.update.mockResolvedValue(noShow as any)

    const result = await useCase.execute(appointment.id, adminUser)
    expect(result.status).toBe(AppointmentStatus.NO_SHOW)
  })

  it('throws UnprocessableEntityException when appointment is COMPLETED', async () => {
    const appointment = makeAppointment({ status: AppointmentStatus.COMPLETED })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    await expect(useCase.execute(appointment.id, adminUser)).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws UnprocessableEntityException when appointment is CANCELLED', async () => {
    const appointment = makeAppointment({ status: AppointmentStatus.CANCELLED })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    await expect(useCase.execute(appointment.id, adminUser)).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws UnprocessableEntityException when appointment is already NO_SHOW', async () => {
    const appointment = makeAppointment({ status: AppointmentStatus.NO_SHOW })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    await expect(useCase.execute(appointment.id, adminUser)).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws UnprocessableEntityException when appointment is in the future', async () => {
    const appointment = makeAppointment({ date: tomorrow })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    await expect(useCase.execute(appointment.id, adminUser)).rejects.toThrow(UnprocessableEntityException)
  })

  it('DOCTOR can mark own past appointment as no-show', async () => {
    const appointment = makeAppointment()
    const noShow = makeAppointment({ status: AppointmentStatus.NO_SHOW })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    mockAppointmentsRepository.update.mockResolvedValue(noShow as any)

    const result = await useCase.execute(appointment.id, doctorUser)
    expect(result.status).toBe(AppointmentStatus.NO_SHOW)
  })

  it('invalidates list and availability caches', async () => {
    const appointment = makeAppointment()
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    mockAppointmentsRepository.update.mockResolvedValue(makeAppointment({ status: AppointmentStatus.NO_SHOW }) as any)

    await useCase.execute(appointment.id, adminUser)

    expect(mockCacheService.delByPrefix).toHaveBeenCalledWith(`appointments:list:${CLINIC_ID}:`)
    expect(mockCacheService.delByPrefix).toHaveBeenCalledWith(
      `appointments:availability:${CLINIC_ID}:${doctorId}:`,
    )
  })

  it('continues when cache invalidation fails', async () => {
    const appointment = makeAppointment()
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    mockAppointmentsRepository.update.mockResolvedValue(makeAppointment({ status: AppointmentStatus.NO_SHOW }) as any)
    mockCacheService.delByPrefix.mockRejectedValue(new Error('Redis error'))

    await expect(useCase.execute(appointment.id, adminUser)).resolves.toBeDefined()
  })

  it('throws ConflictException on OptimisticLockVersionMismatchError', async () => {
    const appointment = makeAppointment()
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    mockAppointmentsRepository.update.mockRejectedValue(new OptimisticLockVersionMismatchError('Appointment', 1, 2))

    await expect(useCase.execute(appointment.id, adminUser)).rejects.toThrow(ConflictException)
  })

  it('rethrows non-optimistic-lock errors', async () => {
    const appointment = makeAppointment()
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    mockAppointmentsRepository.update.mockRejectedValue(new Error('DB error'))

    await expect(useCase.execute(appointment.id, adminUser)).rejects.toThrow('DB error')
  })

  it('includes insuranceType in the response', async () => {
    const appointment = makeAppointment({ insuranceType: 'convenio' })
    const noShow = makeAppointment({ status: AppointmentStatus.NO_SHOW, insuranceType: 'convenio' })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    mockAppointmentsRepository.update.mockResolvedValue(noShow as any)

    const result = await useCase.execute(appointment.id, adminUser)
    expect(result.insuranceType).toBe('convenio')
  })

  it('resolves specialtyName when the no-show appointment has a specialtyId', async () => {
    const builder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([{ name: 'Neurologia' }]),
    }
    const ds = { createQueryBuilder: jest.fn().mockReturnValue(builder) } as unknown as DataSource
    const useCaseWithSpecialty = new MarkAppointmentNoShowUseCase(
      ds,
      mockAppointmentsRepository,
      mockDoctorsRepository,
      mockCacheService,
    )

    const appointment = makeAppointment()
    const noShow = makeAppointment({ status: AppointmentStatus.NO_SHOW, specialtyId: 'spec-y' })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    mockAppointmentsRepository.update.mockResolvedValue(noShow as any)

    const result = await useCaseWithSpecialty.execute(appointment.id, adminUser)

    expect(result.specialtyId).toBe('spec-y')
    expect(result.specialtyName).toBe('Neurologia')
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
    const useCaseEmpty = new MarkAppointmentNoShowUseCase(
      emptyDataSource,
      mockAppointmentsRepository,
      mockDoctorsRepository,
      mockCacheService,
    )

    const appointment = makeAppointment()
    const noShow = makeAppointment({ status: AppointmentStatus.NO_SHOW, specialtyId: 'spec-y' })
    mockAppointmentsRepository.findById.mockResolvedValue(appointment as any)
    mockAppointmentsRepository.update.mockResolvedValue(noShow as any)

    const result = await useCaseEmpty.execute(appointment.id, adminUser)

    expect(result.doctorName).toBe('')
    expect(result.patientName).toBe('')
    expect(result.specialtyName).toBeNull()
  })
})
