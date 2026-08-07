import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IScheduleExceptionsRepository } from '../repositories/schedule-exceptions.repository.interface'
import { DeleteScheduleExceptionUseCase } from '../use-cases/delete-schedule-exception.use-case'

const mockScheduleExceptionsRepository: jest.Mocked<IScheduleExceptionsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findActiveByProfessionalAndDate: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
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
  professionalId: DOCTOR_ID,
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

const doctorUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.PROFESSIONAL, clinicId: CLINIC_ID }
const adminUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }

describe('DeleteScheduleExceptionUseCase', () => {
  let useCase: DeleteScheduleExceptionUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new DeleteScheduleExceptionUseCase(
      {} as DataSource,
      mockScheduleExceptionsRepository,
      mockProfessionalsRepository,
      mockCacheService,
    )
    mockCacheService.delByPrefix.mockResolvedValue(undefined)
    mockCacheService.del.mockResolvedValue(undefined)
    mockScheduleExceptionsRepository.delete.mockResolvedValue(undefined)
  })

  it('throws NotFoundException when exception does not exist', async () => {
    mockScheduleExceptionsRepository.findById.mockResolvedValue(null)
    await expect(useCase.execute(EXCEPTION_ID, adminUser)).rejects.toThrow(NotFoundException)
  })

  it('throws ForbiddenException when DOCTOR tries to delete exception of another doctor', async () => {
    mockScheduleExceptionsRepository.findById.mockResolvedValue(makeException({ professionalId: 'other-doctor' }) as any)
    mockProfessionalsRepository.findByUserId.mockResolvedValue(makeDoctor())
    await expect(useCase.execute(EXCEPTION_ID, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('allows DOCTOR to delete own exception', async () => {
    mockScheduleExceptionsRepository.findById.mockResolvedValue(makeException() as any)
    mockProfessionalsRepository.findByUserId.mockResolvedValue(makeDoctor())

    await useCase.execute(EXCEPTION_ID, doctorUser)

    expect(mockScheduleExceptionsRepository.delete).toHaveBeenCalledWith(EXCEPTION_ID)
  })

  it('allows ADMIN to delete exception of any doctor', async () => {
    mockScheduleExceptionsRepository.findById.mockResolvedValue(makeException() as any)

    await useCase.execute(EXCEPTION_ID, adminUser)

    expect(mockScheduleExceptionsRepository.delete).toHaveBeenCalledWith(EXCEPTION_ID)
  })

  it('invalidates listing and availability cache after deletion', async () => {
    mockScheduleExceptionsRepository.findById.mockResolvedValue(makeException() as any)

    await useCase.execute(EXCEPTION_ID, adminUser)

    expect(mockCacheService.delByPrefix).toHaveBeenCalledWith(`schedule-exceptions:list:${CLINIC_ID}:${DOCTOR_ID}:`)
    expect(mockCacheService.delByPrefix).toHaveBeenCalledWith(`schedule-exceptions:list:${CLINIC_ID}:all:`)
    expect(mockCacheService.del).toHaveBeenCalledWith(`appointments:availability:${CLINIC_ID}:${DOCTOR_ID}:2099-06-20`)
  })

  it('continues when cache invalidation fails', async () => {
    mockScheduleExceptionsRepository.findById.mockResolvedValue(makeException() as any)
    mockCacheService.delByPrefix.mockRejectedValue(new Error('Redis error'))

    await expect(useCase.execute(EXCEPTION_ID, adminUser)).resolves.toBeUndefined()
  })
})
