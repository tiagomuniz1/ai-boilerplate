import { ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { DayOfWeek, UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { ISchedulesRepository } from '../repositories/schedules.repository.interface'
import { CreateScheduleUseCase } from '../use-cases/create-schedule.use-case'

const mockSchedulesRepository: jest.Mocked<ISchedulesRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findOverlapping: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  deleteAllByDoctorId: jest.fn(),
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
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  delByPrefix: jest.fn(),
  delByPattern: jest.fn(),
  setIfNotExists: jest.fn(),
} as unknown as jest.Mocked<CacheService>

const makeDoctor = () => ({ id: faker.string.uuid() } as any)

const makeSchedule = (overrides = {}) => ({
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
})

const makeDto = (overrides = {}) => ({
  dayOfWeek: DayOfWeek.MONDAY,
  startTime: '08:00',
  endTime: '12:00',
  slotDurationInMinutes: 30,
  ...overrides,
})

const doctorUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.DOCTOR }
const adminUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN }

describe('CreateScheduleUseCase', () => {
  let useCase: CreateScheduleUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new CreateScheduleUseCase(
      {} as DataSource,
      mockSchedulesRepository,
      mockDoctorsRepository,
      mockCacheService,
    )
    mockCacheService.delByPrefix.mockResolvedValue(undefined)
  })

  it('creates schedule as doctor using findByUserId (ignores dto.doctorId)', async () => {
    const doctor = makeDoctor()
    const schedule = makeSchedule({ doctorId: doctor.id })
    mockDoctorsRepository.findByUserId.mockResolvedValue(doctor)
    mockSchedulesRepository.findOverlapping.mockResolvedValue(null)
    mockSchedulesRepository.create.mockResolvedValue(schedule as any)

    const result = await useCase.execute(
      makeDto({ doctorId: faker.string.uuid() }),
      doctorUser,
    )

    expect(mockDoctorsRepository.findByUserId).toHaveBeenCalledWith(doctorUser.id)
    expect(mockDoctorsRepository.findById).not.toHaveBeenCalled()
    expect(result.id).toBeDefined()
  })

  it('creates schedule as admin using dto.doctorId', async () => {
    const targetDoctorId = faker.string.uuid()
    const dto = makeDto({ doctorId: targetDoctorId })
    const schedule = makeSchedule({ doctorId: targetDoctorId })
    mockDoctorsRepository.findById.mockResolvedValue({ id: targetDoctorId } as any)
    mockSchedulesRepository.findOverlapping.mockResolvedValue(null)
    mockSchedulesRepository.create.mockResolvedValue(schedule as any)

    await useCase.execute(dto, adminUser)

    expect(mockDoctorsRepository.findById).toHaveBeenCalledWith(targetDoctorId)
  })

  it('throws ForbiddenException when role is USER', async () => {
    const userUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.USER }
    await expect(useCase.execute(makeDto(), userUser)).rejects.toThrow(ForbiddenException)
    expect(mockSchedulesRepository.create).not.toHaveBeenCalled()
  })

  it('throws ForbiddenException when role is PATIENT', async () => {
    const patientUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.PATIENT }
    await expect(useCase.execute(makeDto(), patientUser)).rejects.toThrow(ForbiddenException)
    expect(mockSchedulesRepository.create).not.toHaveBeenCalled()
  })

  it('throws UnprocessableEntityException when admin omits doctorId', async () => {
    await expect(useCase.execute(makeDto(), adminUser)).rejects.toThrow(
      UnprocessableEntityException,
    )
    expect(mockSchedulesRepository.create).not.toHaveBeenCalled()
  })

  it('throws NotFoundException when doctor does not exist', async () => {
    mockDoctorsRepository.findByUserId.mockResolvedValue(null)
    await expect(useCase.execute(makeDto(), doctorUser)).rejects.toThrow(NotFoundException)
    expect(mockSchedulesRepository.create).not.toHaveBeenCalled()
  })

  it('throws UnprocessableEntityException when startTime >= endTime', async () => {
    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor())
    await expect(
      useCase.execute(makeDto({ startTime: '12:00', endTime: '08:00' }), doctorUser),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws UnprocessableEntityException when interval not divisible by slot', async () => {
    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor())
    await expect(
      useCase.execute(makeDto({ startTime: '08:00', endTime: '09:00', slotDurationInMinutes: 40 }), doctorUser),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws UnprocessableEntityException when validFrom >= validUntil', async () => {
    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor())
    await expect(
      useCase.execute(makeDto({ validFrom: '2025-06-01', validUntil: '2025-01-01' }), doctorUser),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws UnprocessableEntityException when validFrom equals validUntil', async () => {
    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor())
    await expect(
      useCase.execute(makeDto({ validFrom: '2025-01-01', validUntil: '2025-01-01' }), doctorUser),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('succeeds with only validFrom (open-ended validity)', async () => {
    const schedule = makeSchedule()
    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor())
    mockSchedulesRepository.findOverlapping.mockResolvedValue(null)
    mockSchedulesRepository.create.mockResolvedValue(schedule as any)

    const result = await useCase.execute(makeDto({ validFrom: '2025-01-01' }), doctorUser)

    expect(result.id).toBeDefined()
  })

  it('throws ConflictException when schedule overlaps', async () => {
    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor())
    mockSchedulesRepository.findOverlapping.mockResolvedValue(makeSchedule() as any)

    await expect(useCase.execute(makeDto(), doctorUser)).rejects.toThrow(ConflictException)
    expect(mockSchedulesRepository.create).not.toHaveBeenCalled()
  })

  it('invalidates cache after creation using doctor profile id', async () => {
    const doctor = makeDoctor()
    const schedule = makeSchedule({ doctorId: doctor.id })
    mockDoctorsRepository.findByUserId.mockResolvedValue(doctor)
    mockSchedulesRepository.findOverlapping.mockResolvedValue(null)
    mockSchedulesRepository.create.mockResolvedValue(schedule as any)

    await useCase.execute(makeDto(), doctorUser)

    expect(mockCacheService.delByPrefix).toHaveBeenCalledWith(`schedules:list:${doctor.id}:`)
    expect(mockCacheService.delByPrefix).toHaveBeenCalledWith('schedules:list:all:')
  })

  it('continues when cache invalidation fails', async () => {
    const schedule = makeSchedule()
    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor())
    mockSchedulesRepository.findOverlapping.mockResolvedValue(null)
    mockSchedulesRepository.create.mockResolvedValue(schedule as any)
    mockCacheService.delByPrefix.mockRejectedValue(new Error('Redis error'))

    const result = await useCase.execute(makeDto(), doctorUser)

    expect(result.id).toBeDefined()
  })

  it('response does not contain version or deletedAt', async () => {
    const schedule = makeSchedule()
    mockDoctorsRepository.findByUserId.mockResolvedValue(makeDoctor())
    mockSchedulesRepository.findOverlapping.mockResolvedValue(null)
    mockSchedulesRepository.create.mockResolvedValue(schedule as any)

    const result = await useCase.execute(makeDto(), doctorUser)

    expect(result).not.toHaveProperty('version')
    expect(result).not.toHaveProperty('deletedAt')
  })
})
