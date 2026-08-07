import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource, OptimisticLockVersionMismatchError, QueryFailedError } from 'typeorm'
import { faker } from '@faker-js/faker'
import { AppointmentStatus, CouncilType, UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { DistributedLockService } from '../../../cache/distributed-lock.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IAppointmentsRepository } from '../repositories/appointments.repository.interface'
import { ResolveProfessionalSlotUseCase } from '../use-cases/resolve-professional-slot.use-case'
import { ReassignAppointmentUseCase } from '../use-cases/reassign-appointment.use-case'

const CLINIC_ID = 'clinic-uuid'
const originalProfessionalId = faker.string.uuid()
const targetProfessionalId = faker.string.uuid()
const specialtyId = faker.string.uuid()

const adminUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }

const tomorrow = new Date()
tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
const tomorrowStr = tomorrow.toISOString().split('T')[0]

const yesterday = new Date()
yesterday.setUTCDate(yesterday.getUTCDate() - 1)
const yesterdayStr = yesterday.toISOString().split('T')[0]

const makeProfessional = (id: string, specialtyIds: string[], councilType = CouncilType.CRM) =>
  ({
    id,
    user: { fullName: 'Dr. Test' },
    registrations: [{ councilType, isPrimary: true }],
    professionalSpecialties: specialtyIds.map((sid) => ({ specialtyId: sid, specialty: { id: sid, name: 'Cardiologia' } })),
  }) as any

const makeAppointment = (overrides = {}) => ({
  id: faker.string.uuid(),
  clinicId: CLINIC_ID,
  professionalId: originalProfessionalId,
  patientId: faker.string.uuid(),
  specialtyId,
  scheduleId: faker.string.uuid(),
  date: tomorrowStr,
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
  findActiveByProfessionalAndDate: jest.fn(),
  findActiveBySlot: jest.fn(),
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

const mockResolveSlot = {
  execute: jest.fn(),
} as unknown as jest.Mocked<ResolveProfessionalSlotUseCase>

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  delByPrefix: jest.fn(),
  setIfNotExists: jest.fn(),
} as unknown as jest.Mocked<CacheService>

const mockDistributedLockService = {
  runWithLock: jest.fn().mockImplementation((_key, _ttl, fn) => fn()),
} as unknown as jest.Mocked<DistributedLockService>

function makeMockDataSource(): DataSource {
  const builder = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([{ fullName: 'Dr. New', name: 'Cardiologia' }]),
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

describe('ReassignAppointmentUseCase', () => {
  let useCase: ReassignAppointmentUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new ReassignAppointmentUseCase(
      makeMockDataSource(),
      mockAppointmentsRepository,
      mockProfessionalsRepository,
      mockResolveSlot,
      mockCacheService,
      mockDistributedLockService,
    )

    mockAppointmentsRepository.findById.mockResolvedValue(makeAppointment() as any)
    mockProfessionalsRepository.findById.mockImplementation(async (id: string) => {
      if (id === originalProfessionalId) return makeProfessional(originalProfessionalId, [specialtyId])
      if (id === targetProfessionalId) return makeProfessional(targetProfessionalId, [specialtyId])
      return null
    })
    mockResolveSlot.execute.mockResolvedValue({ scheduleId: 'new-schedule', endTime: '08:30' } as any)
    mockAppointmentsRepository.findActiveBySlot.mockResolvedValue(null)
    mockAppointmentsRepository.update.mockImplementation(async (id, data) =>
      makeAppointment({ id, professionalId: data.professionalId, scheduleId: data.scheduleId, endTime: data.endTime }) as any,
    )
    mockCacheService.delByPrefix.mockResolvedValue(undefined)
    mockDistributedLockService.runWithLock.mockImplementation((_k: any, _t: any, fn: any) => fn())
  })

  const dto = { professionalId: targetProfessionalId }

  it('throws NotFoundException when appointment does not exist', async () => {
    mockAppointmentsRepository.findById.mockResolvedValue(null)
    await expect(useCase.execute('missing', dto, adminUser)).rejects.toThrow(NotFoundException)
  })

  it('throws 422 when the appointment is not scheduled', async () => {
    mockAppointmentsRepository.findById.mockResolvedValue(
      makeAppointment({ status: AppointmentStatus.COMPLETED }) as any,
    )
    await expect(useCase.execute('id', dto, adminUser)).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws 422 when the target is already the appointment professional', async () => {
    await expect(
      useCase.execute('id', { professionalId: originalProfessionalId }, adminUser),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws NotFoundException when the original professional is missing', async () => {
    mockProfessionalsRepository.findById.mockImplementation(async (id: string) =>
      id === targetProfessionalId ? makeProfessional(targetProfessionalId, [specialtyId]) : null,
    )
    await expect(useCase.execute('id', dto, adminUser)).rejects.toThrow(NotFoundException)
  })

  it('throws NotFoundException when the target professional is missing', async () => {
    mockProfessionalsRepository.findById.mockImplementation(async (id: string) =>
      id === originalProfessionalId ? makeProfessional(originalProfessionalId, [specialtyId]) : null,
    )
    await expect(useCase.execute('id', dto, adminUser)).rejects.toThrow(NotFoundException)
  })

  it('throws 422 when the target does not hold the appointment specialty', async () => {
    mockProfessionalsRepository.findById.mockImplementation(async (id: string) =>
      id === originalProfessionalId
        ? makeProfessional(originalProfessionalId, [specialtyId])
        : makeProfessional(targetProfessionalId, [faker.string.uuid()]),
    )
    await expect(useCase.execute('id', dto, adminUser)).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws 422 when a generalist appointment target has a different council', async () => {
    mockAppointmentsRepository.findById.mockResolvedValue(makeAppointment({ specialtyId: null }) as any)
    mockProfessionalsRepository.findById.mockImplementation(async (id: string) =>
      id === originalProfessionalId
        ? makeProfessional(originalProfessionalId, [], CouncilType.CRN)
        : makeProfessional(targetProfessionalId, [], CouncilType.CREFITO),
    )
    await expect(useCase.execute('id', dto, adminUser)).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws 422 when the appointment is in the past', async () => {
    mockAppointmentsRepository.findById.mockResolvedValue(makeAppointment({ date: yesterdayStr }) as any)
    await expect(useCase.execute('id', dto, adminUser)).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws 422 when the target is not available at the slot', async () => {
    mockResolveSlot.execute.mockResolvedValue(null)
    await expect(useCase.execute('id', dto, adminUser)).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws ConflictException when the slot is taken inside the lock', async () => {
    mockAppointmentsRepository.findActiveBySlot.mockResolvedValue({ id: faker.string.uuid() } as any)
    await expect(useCase.execute('id', dto, adminUser)).rejects.toThrow(ConflictException)
  })

  it('throws ConflictException on unique-violation (23505)', async () => {
    const pgError = Object.assign(new QueryFailedError('UPDATE ...', [], new Error('dup')), { code: '23505' })
    mockDistributedLockService.runWithLock.mockRejectedValue(pgError)
    await expect(useCase.execute('id', dto, adminUser)).rejects.toThrow(ConflictException)
  })

  it('throws ConflictException on optimistic lock mismatch', async () => {
    mockDistributedLockService.runWithLock.mockRejectedValue(new OptimisticLockVersionMismatchError('Appointment', 1, 2))
    await expect(useCase.execute('id', dto, adminUser)).rejects.toThrow(ConflictException)
  })

  it('rethrows a non-23505 QueryFailedError', async () => {
    const pgError = Object.assign(new QueryFailedError('UPDATE ...', [], new Error('other')), { code: '23502' })
    mockDistributedLockService.runWithLock.mockRejectedValue(pgError)
    await expect(useCase.execute('id', dto, adminUser)).rejects.toThrow(QueryFailedError)
  })

  it('updates professionalId/scheduleId/endTime and keeps specialtyId, then returns the dto', async () => {
    const result = await useCase.execute('appt-1', dto, adminUser)

    expect(mockAppointmentsRepository.update).toHaveBeenCalledWith(
      'appt-1',
      { professionalId: targetProfessionalId, scheduleId: 'new-schedule', endTime: '08:30' },
      expect.anything(),
    )
    expect(result.professionalId).toBe(targetProfessionalId)
    expect(result.professionalName).toBe('Dr. New')
    expect(result.specialtyId).toBe(specialtyId)
  })

  it('invalidates availability cache for both the original and the target professional', async () => {
    await useCase.execute('appt-1', dto, adminUser)
    expect(mockCacheService.delByPrefix).toHaveBeenCalledWith(`appointments:availability:${CLINIC_ID}:${originalProfessionalId}:`)
    expect(mockCacheService.delByPrefix).toHaveBeenCalledWith(`appointments:availability:${CLINIC_ID}:${targetProfessionalId}:`)
    expect(mockCacheService.delByPrefix).toHaveBeenCalledWith(`appointments:list:${CLINIC_ID}:`)
    expect(mockCacheService.delByPrefix).toHaveBeenCalledWith(`dashboard:${CLINIC_ID}:`)
  })

  it('continues when cache invalidation fails', async () => {
    mockCacheService.delByPrefix.mockRejectedValue(new Error('Redis down'))
    await expect(useCase.execute('appt-1', dto, adminUser)).resolves.toBeDefined()
  })

  it('reassigns a generalist appointment (null specialty) between same-council professionals', async () => {
    mockAppointmentsRepository.findById.mockResolvedValue(makeAppointment({ specialtyId: null }) as any)
    mockProfessionalsRepository.findById.mockImplementation(async (id: string) =>
      id === originalProfessionalId
        ? makeProfessional(originalProfessionalId, [], CouncilType.CRN)
        : makeProfessional(targetProfessionalId, [], CouncilType.CRN),
    )
    mockAppointmentsRepository.update.mockImplementation(async (id, data) =>
      makeAppointment({ id, specialtyId: null, professionalId: data.professionalId }) as any,
    )

    const result = await useCase.execute('appt-1', dto, adminUser)

    expect(result.specialtyId).toBeNull()
    expect(result.specialtyName).toBeNull()
    expect(result.professionalId).toBe(targetProfessionalId)
  })

  it('returns empty name fields when the lookup queries return no rows', async () => {
    const emptyBuilder = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    }
    const emptyDataSource = {
      createQueryBuilder: jest.fn().mockReturnValue(emptyBuilder),
      createQueryRunner: jest.fn().mockReturnValue({
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: { getRepository: jest.fn() },
      }),
    } as unknown as DataSource

    const useCaseEmpty = new ReassignAppointmentUseCase(
      emptyDataSource,
      mockAppointmentsRepository,
      mockProfessionalsRepository,
      mockResolveSlot,
      mockCacheService,
      mockDistributedLockService,
    )

    const result = await useCaseEmpty.execute('appt-1', dto, adminUser)

    expect(result.professionalName).toBe('')
    expect(result.patientName).toBe('')
    expect(result.specialtyName).toBeNull()
  })
})
