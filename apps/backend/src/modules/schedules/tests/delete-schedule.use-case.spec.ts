import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { DayOfWeek, UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IAppointmentsRepository } from '../repositories/appointments.repository.adapter'
import { ISchedulesRepository } from '../repositories/schedules.repository.interface'
import { DeleteScheduleUseCase } from '../use-cases/delete-schedule.use-case'

const mockSchedulesRepository: jest.Mocked<ISchedulesRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findOverlapping: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  deleteAllByProfessionalId: jest.fn(),
  findActiveByProfessionalAndDate: jest.fn(),
}

const mockProfessionalsRepository: jest.Mocked<IProfessionalsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByRegistration: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockAppointmentsRepository: jest.Mocked<IAppointmentsRepository> = {
  hasFutureAppointmentsByScheduleId: jest.fn(),
}

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  delByPrefix: jest.fn(),
  delByPattern: jest.fn(),
  setIfNotExists: jest.fn(),
} as unknown as jest.Mocked<CacheService>

const CLINIC_ID = 'fixed-clinic-uuid'
const ownerId = faker.string.uuid()
const otherDoctorId = faker.string.uuid()

const ownerUser: ICurrentUser = { id: ownerId, role: UserRole.PROFESSIONAL, clinicId: CLINIC_ID }
const otherDoctorUser: ICurrentUser = { id: otherDoctorId, role: UserRole.PROFESSIONAL, clinicId: CLINIC_ID }
const adminUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }

const makeSchedule = (overrides = {}) => ({
  id: faker.string.uuid(),
  professionalId: ownerId,
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

describe('DeleteScheduleUseCase', () => {
  let useCase: DeleteScheduleUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new DeleteScheduleUseCase(
      {} as DataSource,
      mockSchedulesRepository,
      mockProfessionalsRepository,
      mockAppointmentsRepository,
      mockCacheService,
    )
    mockAppointmentsRepository.hasFutureAppointmentsByScheduleId.mockResolvedValue(false)
    mockCacheService.delByPrefix.mockResolvedValue(undefined)
    mockProfessionalsRepository.findByUserId.mockImplementation((userId: string) =>
      Promise.resolve({ id: userId } as any),
    )
  })

  it('throws NotFoundException when schedule not found', async () => {
    mockSchedulesRepository.findById.mockResolvedValue(null)
    await expect(useCase.execute(faker.string.uuid(), ownerUser)).rejects.toThrow(NotFoundException)
  })

  it('throws ForbiddenException when role is USER', async () => {
    mockSchedulesRepository.findById.mockResolvedValue(makeSchedule() as any)
    const userUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.USER, clinicId: faker.string.uuid() }
    await expect(useCase.execute(faker.string.uuid(), userUser)).rejects.toThrow(ForbiddenException)
    expect(mockSchedulesRepository.delete).not.toHaveBeenCalled()
  })

  it('throws ForbiddenException when role is PATIENT', async () => {
    mockSchedulesRepository.findById.mockResolvedValue(makeSchedule() as any)
    const patientUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.PATIENT, clinicId: faker.string.uuid() }
    await expect(useCase.execute(faker.string.uuid(), patientUser)).rejects.toThrow(ForbiddenException)
    expect(mockSchedulesRepository.delete).not.toHaveBeenCalled()
  })

  it('throws NotFoundException when DOCTOR has no profile', async () => {
    mockSchedulesRepository.findById.mockResolvedValue(makeSchedule() as any)
    mockProfessionalsRepository.findByUserId.mockResolvedValue(null)
    await expect(useCase.execute(faker.string.uuid(), ownerUser)).rejects.toThrow(NotFoundException)
    expect(mockSchedulesRepository.delete).not.toHaveBeenCalled()
  })

  it('throws ForbiddenException when doctor tries to delete another doctor schedule', async () => {
    mockSchedulesRepository.findById.mockResolvedValue(makeSchedule() as any)
    await expect(useCase.execute(faker.string.uuid(), otherDoctorUser)).rejects.toThrow(
      ForbiddenException,
    )
  })

  it('allows admin to delete any schedule', async () => {
    const schedule = makeSchedule()
    mockSchedulesRepository.findById.mockResolvedValue(schedule as any)
    mockSchedulesRepository.delete.mockResolvedValue(undefined)

    await expect(useCase.execute(schedule.id, adminUser)).resolves.toBeUndefined()
  })

  it('throws ConflictException when schedule has future appointments', async () => {
    mockSchedulesRepository.findById.mockResolvedValue(makeSchedule() as any)
    mockAppointmentsRepository.hasFutureAppointmentsByScheduleId.mockResolvedValue(true)

    await expect(useCase.execute(faker.string.uuid(), ownerUser)).rejects.toThrow(ConflictException)
    expect(mockSchedulesRepository.delete).not.toHaveBeenCalled()
  })

  it('soft deletes and invalidates cache using schedule.professionalId', async () => {
    const schedule = makeSchedule()
    mockSchedulesRepository.findById.mockResolvedValue(schedule as any)
    mockSchedulesRepository.delete.mockResolvedValue(undefined)

    await useCase.execute(schedule.id, ownerUser)

    expect(mockSchedulesRepository.delete).toHaveBeenCalledWith(schedule.id)
    expect(mockCacheService.del).toHaveBeenCalledWith(`schedule:${CLINIC_ID}:${schedule.id}`)
    expect(mockCacheService.delByPrefix).toHaveBeenCalledWith(`schedules:list:${CLINIC_ID}:`)
  })

  it('continues when cache invalidation fails', async () => {
    const schedule = makeSchedule()
    mockSchedulesRepository.findById.mockResolvedValue(schedule as any)
    mockSchedulesRepository.delete.mockResolvedValue(undefined)
    mockCacheService.delByPrefix.mockRejectedValue(new Error('Redis error'))

    await expect(useCase.execute(schedule.id, ownerUser)).resolves.toBeUndefined()
  })

  describe('deleteByProfessionalId', () => {
    it('calls deleteAllByProfessionalId on repository and invalidates cache', async () => {
      const professionalId = faker.string.uuid()
      mockSchedulesRepository.deleteAllByProfessionalId = jest.fn().mockResolvedValue(undefined)
      mockCacheService.delByPrefix.mockResolvedValue(undefined)

      await useCase.deleteByProfessionalId(professionalId, CLINIC_ID)

      expect(mockSchedulesRepository.deleteAllByProfessionalId).toHaveBeenCalledWith(professionalId, CLINIC_ID, undefined)
      expect(mockCacheService.delByPrefix).toHaveBeenCalledWith(`schedules:list:${CLINIC_ID}:`)
    })

    it('passes queryRunner to repository when provided', async () => {
      const professionalId = faker.string.uuid()
      const queryRunner = {} as any
      mockSchedulesRepository.deleteAllByProfessionalId = jest.fn().mockResolvedValue(undefined)

      await useCase.deleteByProfessionalId(professionalId, CLINIC_ID, queryRunner)

      expect(mockSchedulesRepository.deleteAllByProfessionalId).toHaveBeenCalledWith(professionalId, CLINIC_ID, queryRunner)
    })

    it('continues without throwing when cache invalidation fails', async () => {
      const professionalId = faker.string.uuid()
      mockSchedulesRepository.deleteAllByProfessionalId = jest.fn().mockResolvedValue(undefined)
      mockCacheService.delByPrefix.mockRejectedValue(new Error('Redis error'))

      await expect(useCase.deleteByProfessionalId(professionalId, CLINIC_ID)).resolves.toBeUndefined()
    })
  })
})
