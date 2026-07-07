import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IAppointmentsRepository } from '../repositories/appointments.repository.adapter'
import { IScheduleExceptionsRepository } from '../repositories/schedule-exceptions.repository.interface'
import { CreateScheduleExceptionUseCase } from '../use-cases/create-schedule-exception.use-case'

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
  findByCrm: jest.fn(),
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

const makeDoctor = (id = DOCTOR_ID) => ({ id } as any)

const makeException = (overrides = {}) => ({
  id: faker.string.uuid(),
  clinicId: CLINIC_ID,
  doctorId: DOCTOR_ID,
  date: '2099-06-20',
  startTime: null,
  endTime: null,
  reason: null,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

const doctorUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.DOCTOR, clinicId: CLINIC_ID }
const adminUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }

function makeUseCase() {
  return new CreateScheduleExceptionUseCase(
    {} as DataSource,
    mockScheduleExceptionsRepository,
    mockDoctorsRepository,
    mockAppointmentsRepository,
    mockCacheService,
  )
}

describe('CreateScheduleExceptionUseCase', () => {
  let useCase: CreateScheduleExceptionUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = makeUseCase()
    mockCacheService.delByPrefix.mockResolvedValue(undefined)
    mockCacheService.del.mockResolvedValue(undefined)
    mockAppointmentsRepository.findScheduledAppointmentsInWindow.mockResolvedValue([])
  })

  it('creates all-day exception as DOCTOR using own profile (ignores dto.doctorId)', async () => {
    const doctor = makeDoctor()
    const exception = makeException({ doctorId: doctor.id })
    mockDoctorsRepository.findByUserId.mockResolvedValue(doctor)
    mockScheduleExceptionsRepository.create.mockResolvedValue(exception as any)

    const result = await useCase.execute({ date: '2099-06-20', doctorId: faker.string.uuid() }, doctorUser)

    expect(mockDoctorsRepository.findByUserId).toHaveBeenCalledWith(doctorUser.id, CLINIC_ID)
    expect(mockDoctorsRepository.findById).not.toHaveBeenCalled()
    expect(result.id).toBeDefined()
  })

  it('creates exception as ADMIN using dto.doctorId', async () => {
    const exception = makeException()
    mockDoctorsRepository.findById.mockResolvedValue(makeDoctor())
    mockScheduleExceptionsRepository.create.mockResolvedValue(exception as any)

    await useCase.execute({ date: '2099-06-20', doctorId: DOCTOR_ID }, adminUser)

    expect(mockDoctorsRepository.findById).toHaveBeenCalledWith(DOCTOR_ID, CLINIC_ID)
  })

  it('throws NotFoundException when DOCTOR has no doctor profile', async () => {
    mockDoctorsRepository.findByUserId.mockResolvedValue(null)
    await expect(useCase.execute({ date: '2099-06-20' }, doctorUser)).rejects.toThrow(NotFoundException)
    expect(mockScheduleExceptionsRepository.create).not.toHaveBeenCalled()
  })

  it('throws UnprocessableEntityException when ADMIN omits doctorId', async () => {
    await expect(useCase.execute({ date: '2099-06-20' }, adminUser)).rejects.toThrow(UnprocessableEntityException)
    expect(mockScheduleExceptionsRepository.create).not.toHaveBeenCalled()
  })

  it('throws NotFoundException when ADMIN provides non-existent doctorId', async () => {
    mockDoctorsRepository.findById.mockResolvedValue(null)
    await expect(useCase.execute({ date: '2099-06-20', doctorId: DOCTOR_ID }, adminUser)).rejects.toThrow(NotFoundException)
    expect(mockScheduleExceptionsRepository.create).not.toHaveBeenCalled()
  })

  it('throws UnprocessableEntityException when startTime >= endTime', async () => {
    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor())
    await expect(
      useCase.execute({ date: '2099-06-20', startTime: '14:00', endTime: '08:00' }, doctorUser),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws UnprocessableEntityException when startTime equals endTime', async () => {
    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor())
    await expect(
      useCase.execute({ date: '2099-06-20', startTime: '10:00', endTime: '10:00' }, doctorUser),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws ConflictException with time list when appointment conflicts exist', async () => {
    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor())
    mockAppointmentsRepository.findScheduledAppointmentsInWindow.mockResolvedValue([
      { id: 'appt-1', startTime: '09:00', endTime: '09:30', patientName: 'Patient A' },
      { id: 'appt-2', startTime: '10:00', endTime: '10:30', patientName: 'Patient B' },
    ])

    await expect(
      useCase.execute({ date: '2099-06-20', startTime: '08:00', endTime: '12:00' }, doctorUser),
    ).rejects.toThrow(ConflictException)

    await expect(
      useCase.execute({ date: '2099-06-20', startTime: '08:00', endTime: '12:00' }, doctorUser),
    ).rejects.toThrow('09:00')

    expect(mockScheduleExceptionsRepository.create).not.toHaveBeenCalled()
  })

  it('creates partial block (14:00-18:00) successfully', async () => {
    const exception = makeException({ startTime: '14:00', endTime: '18:00' })
    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor())
    mockScheduleExceptionsRepository.create.mockResolvedValue(exception as any)

    const result = await useCase.execute({ date: '2099-06-20', startTime: '14:00', endTime: '18:00' }, doctorUser)

    expect(result.startTime).toBe('14:00')
    expect(result.endTime).toBe('18:00')
  })

  it('creates all-day block when startTime/endTime are null', async () => {
    const exception = makeException()
    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor())
    mockScheduleExceptionsRepository.create.mockResolvedValue(exception as any)

    const result = await useCase.execute({ date: '2099-06-20' }, doctorUser)

    expect(result.startTime).toBeNull()
    expect(result.endTime).toBeNull()
    expect(mockScheduleExceptionsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ startTime: null, endTime: null }),
    )
  })

  it('invalidates listing and availability cache after creation', async () => {
    const exception = makeException()
    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor())
    mockScheduleExceptionsRepository.create.mockResolvedValue(exception as any)

    await useCase.execute({ date: '2099-06-20' }, doctorUser)

    expect(mockCacheService.delByPrefix).toHaveBeenCalledWith(`schedule-exceptions:list:${CLINIC_ID}:${DOCTOR_ID}:`)
    expect(mockCacheService.delByPrefix).toHaveBeenCalledWith(`schedule-exceptions:list:${CLINIC_ID}:all:`)
    expect(mockCacheService.del).toHaveBeenCalledWith(`appointments:availability:${CLINIC_ID}:${DOCTOR_ID}:2099-06-20`)
  })

  it('continues when cache invalidation fails', async () => {
    const exception = makeException()
    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor())
    mockScheduleExceptionsRepository.create.mockResolvedValue(exception as any)
    mockCacheService.delByPrefix.mockRejectedValue(new Error('Redis error'))

    const result = await useCase.execute({ date: '2099-06-20' }, doctorUser)
    expect(result.id).toBeDefined()
  })
})
