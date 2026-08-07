import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource, QueryRunner } from 'typeorm'
import { faker } from '@faker-js/faker'
import { CouncilType, UserRole } from '@app/shared'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IUsersRepository } from '../../users/repositories/users.repository.interface'
import { IAppointmentsRepository } from '../../appointments/repositories/appointments.repository.interface'
import { DeleteScheduleUseCase } from '../../schedules/use-cases/delete-schedule.use-case'
import { IProfessionalsRepository } from '../repositories/professionals.repository.interface'
import { DeleteProfessionalUseCase } from '../use-cases/delete-professional.use-case'

const mockQueryRunner = {
  connect: jest.fn().mockResolvedValue(undefined),
  startTransaction: jest.fn().mockResolvedValue(undefined),
  commitTransaction: jest.fn().mockResolvedValue(undefined),
  rollbackTransaction: jest.fn().mockResolvedValue(undefined),
  release: jest.fn().mockResolvedValue(undefined),
  manager: {},
} as unknown as QueryRunner

function makePatientCheckQb(hasProfile: boolean) {
  return {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(hasProfile ? [{ '?column?': '1' }] : []),
  }
}

const mockDataSource = {
  createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  createQueryBuilder: jest.fn(),
} as unknown as DataSource

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
  setIfNotExists: jest.fn(),
  delByPattern: jest.fn(),
} as unknown as jest.Mocked<CacheService>

const mockUsersRepository: jest.Mocked<IUsersRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  updatePassword: jest.fn(),
}

const mockDeleteScheduleUseCase = {
  deleteByProfessionalId: jest.fn(),
} as unknown as jest.Mocked<DeleteScheduleUseCase>

const mockAppointmentsRepository = {
  hasFutureByProfessionalId: jest.fn(),
} as unknown as jest.Mocked<IAppointmentsRepository>

const makeProfessional = (role = UserRole.PROFESSIONAL) => ({
  id: faker.string.uuid(),
  userId: faker.string.uuid(),
  user: { id: faker.string.uuid(), fullName: faker.person.fullName(), email: faker.internet.email(), role } as any,
  registrations: [{ id: faker.string.uuid(), councilType: CouncilType.CRM, number: '12345', state: 'SP', isPrimary: true }],
  professionalSpecialties: [
    { id: faker.string.uuid(), specialtyId: 'spec-1', specialty: { id: 'spec-1', name: 'Cardiologia' }, registryNumber: null },
  ],
  bio: null,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
})

const CLINIC_ID = 'fixed-clinic-uuid'
const adminCurrentUser: ICurrentUser = { id: faker.string.uuid(), role: UserRole.ADMIN, clinicId: CLINIC_ID }

describe('DeleteProfessionalUseCase', () => {
  let useCase: DeleteProfessionalUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new DeleteProfessionalUseCase(
      mockDataSource,
      mockProfessionalsRepository,
      mockUsersRepository,
      mockAppointmentsRepository,
      mockCacheService,
      mockDeleteScheduleUseCase,
    )
    mockAppointmentsRepository.hasFutureByProfessionalId.mockResolvedValue(false)
    mockDeleteScheduleUseCase.deleteByProfessionalId.mockResolvedValue(undefined)
    mockProfessionalsRepository.delete.mockResolvedValue(undefined)
    mockUsersRepository.delete.mockResolvedValue(undefined)
    mockUsersRepository.update.mockResolvedValue(undefined as any)
    mockCacheService.del.mockResolvedValue(undefined)
    mockCacheService.delByPattern.mockResolvedValue(undefined)
    ;(mockDataSource.createQueryBuilder as jest.Mock).mockReturnValue(makePatientCheckQb(false))
  })

  it('cascades to schedules, deletes professional and linked DOCTOR-role user in a transaction', async () => {
    const professional = makeProfessional(UserRole.PROFESSIONAL)
    mockProfessionalsRepository.findById.mockResolvedValue(professional as any)

    await expect(useCase.execute(professional.id, adminCurrentUser)).resolves.toBeUndefined()

    expect(mockDeleteScheduleUseCase.deleteByProfessionalId).toHaveBeenCalledWith(professional.id, CLINIC_ID, mockQueryRunner)
    expect(mockProfessionalsRepository.delete).toHaveBeenCalledWith(professional.id, mockQueryRunner)
    expect(mockUsersRepository.delete).toHaveBeenCalledWith(professional.userId, mockQueryRunner)
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled()
  })

  it('does not delete linked user when user role is not DOCTOR', async () => {
    const professional = makeProfessional(UserRole.ADMIN)
    mockProfessionalsRepository.findById.mockResolvedValue(professional as any)

    await useCase.execute(professional.id, adminCurrentUser)

    expect(mockProfessionalsRepository.delete).toHaveBeenCalledWith(professional.id, mockQueryRunner)
    expect(mockUsersRepository.delete).not.toHaveBeenCalled()
  })

  it('throws ForbiddenException when trying to delete own professional profile', async () => {
    const professional = makeProfessional()
    mockProfessionalsRepository.findById.mockResolvedValue(professional as any)
    const selfCurrentUser: ICurrentUser = { id: professional.userId, role: UserRole.ADMIN, clinicId: CLINIC_ID }

    await expect(useCase.execute(professional.id, selfCurrentUser)).rejects.toThrow(ForbiddenException)
    expect(mockProfessionalsRepository.delete).not.toHaveBeenCalled()
    expect(mockUsersRepository.delete).not.toHaveBeenCalled()
  })

  it('throws NotFoundException when professional does not exist', async () => {
    mockProfessionalsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(faker.string.uuid(), adminCurrentUser)).rejects.toThrow(NotFoundException)
    expect(mockProfessionalsRepository.delete).not.toHaveBeenCalled()
    expect(mockUsersRepository.delete).not.toHaveBeenCalled()
    expect(mockDeleteScheduleUseCase.deleteByProfessionalId).not.toHaveBeenCalled()
  })

  it('rolls back transaction and rethrows when professional delete fails', async () => {
    const professional = makeProfessional()
    mockProfessionalsRepository.findById.mockResolvedValue(professional as any)
    mockProfessionalsRepository.delete.mockRejectedValue(new Error('DB error'))

    await expect(useCase.execute(professional.id, adminCurrentUser)).rejects.toThrow('DB error')
    expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled()
    expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled()
  })

  it('blocks deletion (ConflictException) when the professional has future scheduled appointments', async () => {
    const professional = makeProfessional()
    mockProfessionalsRepository.findById.mockResolvedValue(professional as any)
    mockAppointmentsRepository.hasFutureByProfessionalId.mockResolvedValue(true)

    await expect(useCase.execute(professional.id, adminCurrentUser)).rejects.toBeInstanceOf(ConflictException)
    expect(mockAppointmentsRepository.hasFutureByProfessionalId).toHaveBeenCalledWith(professional.id, CLINIC_ID)
    expect(mockProfessionalsRepository.delete).not.toHaveBeenCalled()
    expect(mockDeleteScheduleUseCase.deleteByProfessionalId).not.toHaveBeenCalled()
  })

  it('proceeds with deletion when there are no future scheduled appointments', async () => {
    const professional = makeProfessional()
    mockProfessionalsRepository.findById.mockResolvedValue(professional as any)
    ;(mockDataSource.createQueryBuilder as jest.Mock).mockReturnValue(makePatientCheckQb(false))
    mockAppointmentsRepository.hasFutureByProfessionalId.mockResolvedValue(false)

    await useCase.execute(professional.id, adminCurrentUser)

    expect(mockProfessionalsRepository.delete).toHaveBeenCalled()
  })

  it('invalidates professional and user caches after deletion of DOCTOR-role user', async () => {
    const professional = makeProfessional(UserRole.PROFESSIONAL)
    mockProfessionalsRepository.findById.mockResolvedValue(professional as any)

    await useCase.execute(professional.id, adminCurrentUser)

    expect(mockCacheService.del).toHaveBeenCalledWith(`professional:${CLINIC_ID}:${professional.id}`)
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith(`professionals:list:${CLINIC_ID}*`)
    expect(mockCacheService.del).toHaveBeenCalledWith(`user:${CLINIC_ID}:${professional.userId}`)
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith(`users:list:${CLINIC_ID}*`)
  })

  it('invalidates professional and user caches when linked user role is not DOCTOR', async () => {
    const professional = makeProfessional(UserRole.PATIENT)
    mockProfessionalsRepository.findById.mockResolvedValue(professional as any)

    await useCase.execute(professional.id, adminCurrentUser)

    expect(mockCacheService.del).toHaveBeenCalledWith(`professional:${CLINIC_ID}:${professional.id}`)
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith(`professionals:list:${CLINIC_ID}*`)
    expect(mockCacheService.del).toHaveBeenCalledWith(`user:${CLINIC_ID}:${professional.userId}`)
    expect(mockCacheService.delByPattern).toHaveBeenCalledWith(`users:list:${CLINIC_ID}*`)
  })

  it('demotes user to PATIENT with isActive false when linked user has a patient profile', async () => {
    const professional = makeProfessional(UserRole.PROFESSIONAL)
    mockProfessionalsRepository.findById.mockResolvedValue(professional as any)
    ;(mockDataSource.createQueryBuilder as jest.Mock).mockReturnValue(makePatientCheckQb(true))

    await useCase.execute(professional.id, adminCurrentUser)

    expect(mockProfessionalsRepository.delete).toHaveBeenCalledWith(professional.id, mockQueryRunner)
    expect(mockUsersRepository.update).toHaveBeenCalledWith(
      professional.userId,
      { role: UserRole.PATIENT, isActive: false },
      mockQueryRunner,
    )
    expect(mockUsersRepository.delete).not.toHaveBeenCalled()
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled()
  })

  it('does not demote user when role is not DOCTOR even if patient profile exists', async () => {
    const professional = makeProfessional(UserRole.USER)
    mockProfessionalsRepository.findById.mockResolvedValue(professional as any)
    ;(mockDataSource.createQueryBuilder as jest.Mock).mockReturnValue(makePatientCheckQb(true))

    await useCase.execute(professional.id, adminCurrentUser)

    expect(mockUsersRepository.update).not.toHaveBeenCalled()
    expect(mockUsersRepository.delete).not.toHaveBeenCalled()
  })

  it('continues when cache invalidation fails', async () => {
    const professional = makeProfessional()
    mockProfessionalsRepository.findById.mockResolvedValue(professional as any)
    mockCacheService.del.mockRejectedValue(new Error('Redis error'))

    await expect(useCase.execute(professional.id, adminCurrentUser)).resolves.toBeUndefined()
  })

  describe('deleteByUserId', () => {
    it('cascades to schedules and deletes professional when found', async () => {
      const userId = faker.string.uuid()
      const professional = makeProfessional()
      mockProfessionalsRepository.findByUserId.mockResolvedValue(professional as any)

      await useCase.deleteByUserId(userId, CLINIC_ID)

      expect(mockDeleteScheduleUseCase.deleteByProfessionalId).toHaveBeenCalledWith(professional.id, CLINIC_ID, undefined)
      expect(mockProfessionalsRepository.delete).toHaveBeenCalledWith(professional.id, undefined)
    })

    it('does nothing when no professional with userId exists', async () => {
      mockProfessionalsRepository.findByUserId.mockResolvedValue(null)

      await expect(useCase.deleteByUserId(faker.string.uuid(), CLINIC_ID)).resolves.toBeUndefined()
      expect(mockDeleteScheduleUseCase.deleteByProfessionalId).not.toHaveBeenCalled()
      expect(mockProfessionalsRepository.delete).not.toHaveBeenCalled()
    })

    it('passes queryRunner to schedule and professional delete', async () => {
      const userId = faker.string.uuid()
      const professional = makeProfessional()
      const queryRunner = {} as any
      mockProfessionalsRepository.findByUserId.mockResolvedValue(professional as any)

      await useCase.deleteByUserId(userId, CLINIC_ID, queryRunner)

      expect(mockDeleteScheduleUseCase.deleteByProfessionalId).toHaveBeenCalledWith(professional.id, CLINIC_ID, queryRunner)
      expect(mockProfessionalsRepository.delete).toHaveBeenCalledWith(professional.id, queryRunner)
    })

    it('continues without throwing when cache invalidation fails', async () => {
      const professional = makeProfessional()
      mockProfessionalsRepository.findByUserId.mockResolvedValue(professional as any)
      mockCacheService.del.mockRejectedValue(new Error('Redis error'))

      await expect(useCase.deleteByUserId(faker.string.uuid(), CLINIC_ID)).resolves.toBeUndefined()
    })
  })
})
