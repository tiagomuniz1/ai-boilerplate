import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource, QueryRunner } from 'typeorm'
import { ExamRequestStatus, UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { IExamRequestsRepository } from '../repositories/exam-requests.repository.interface'
import { IExamResultsRepository } from '../repositories/exam-results.repository.interface'
import { DeleteExamRequestUseCase } from '../use-cases/delete-exam-request.use-case'
import { CacheService } from '../../../cache/cache.service'

const clinicId = 'clinic-uuid'
const doctorId = 'doctor-uuid'
const examRequestId = 'exam-uuid'
const appointmentId = 'appt-uuid'

const adminUser: ICurrentUser = { id: 'admin-id', role: UserRole.ADMIN, clinicId }
const doctorUser: ICurrentUser = { id: 'doctor-user-id', role: UserRole.DOCTOR, clinicId }

const makeExamRequest = (overrides = {}) => ({
  id: examRequestId,
  clinicId,
  appointmentId,
  patientId: 'patient-uuid',
  doctorId,
  issuedAt: new Date(),
  status: ExamRequestStatus.REQUESTED,
  snapshot: {
    issuedAt: new Date().toISOString(),
    clinic: { name: 'Clinic', address: null, logoUrl: null },
    doctor: { name: 'Doctor', crmNumber: '12345/SP', specialtyName: null },
    patient: { name: 'Patient', documentNumber: '12345678900' },
    items: [],
    notes: null,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

const mockQueryRunner = {
  connect: jest.fn().mockResolvedValue(undefined),
  startTransaction: jest.fn().mockResolvedValue(undefined),
  commitTransaction: jest.fn().mockResolvedValue(undefined),
  rollbackTransaction: jest.fn().mockResolvedValue(undefined),
  release: jest.fn().mockResolvedValue(undefined),
  manager: {},
} as unknown as QueryRunner

const mockDataSource = {
  createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
} as unknown as DataSource

const mockExamRequestsRepository: jest.Mocked<IExamRequestsRepository> = {
  findByAppointment: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  updateStatus: jest.fn(),
  delete: jest.fn(),
}

const mockExamResultsRepository: jest.Mocked<IExamResultsRepository> = {
  findByExamRequestIds: jest.fn(),
  findById: jest.fn(),
  countActiveByExamRequest: jest.fn(),
  create: jest.fn(),
  deleteByExamRequestId: jest.fn(),
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

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  delByPattern: jest.fn(),
  setIfNotExists: jest.fn(),
} as unknown as jest.Mocked<CacheService>

describe('DeleteExamRequestUseCase', () => {
  let useCase: DeleteExamRequestUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new DeleteExamRequestUseCase(
      mockDataSource,
      mockExamRequestsRepository,
      mockExamResultsRepository,
      mockDoctorsRepository,
      mockCacheService,
    )
    mockExamRequestsRepository.findById.mockResolvedValue(makeExamRequest() as any)
    mockDoctorsRepository.findByUserId.mockResolvedValue({ id: doctorId } as any)
    mockExamRequestsRepository.delete.mockResolvedValue(undefined)
    mockExamResultsRepository.deleteByExamRequestId.mockResolvedValue(undefined)
    mockCacheService.del.mockResolvedValue(undefined)
  })

  it('deletes exam request for ADMIN', async () => {
    await useCase.execute(examRequestId, adminUser)

    expect(mockExamRequestsRepository.delete).toHaveBeenCalledWith(examRequestId, mockQueryRunner)
    expect(mockDoctorsRepository.findByUserId).not.toHaveBeenCalled()
  })

  it('deletes exam request for DOCTOR on own exam request', async () => {
    await useCase.execute(examRequestId, doctorUser)

    expect(mockExamRequestsRepository.delete).toHaveBeenCalledWith(examRequestId, mockQueryRunner)
    expect(mockDoctorsRepository.findByUserId).toHaveBeenCalledWith(doctorUser.id, clinicId)
  })

  it('cascades soft-delete of exam results before deleting the request, in the same transaction', async () => {
    await useCase.execute(examRequestId, adminUser)

    expect(mockExamResultsRepository.deleteByExamRequestId).toHaveBeenCalledWith(examRequestId, mockQueryRunner)
    expect(mockExamRequestsRepository.delete).toHaveBeenCalledWith(examRequestId, mockQueryRunner)
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled()
  })

  it('rolls back the transaction and rethrows when the cascade delete fails', async () => {
    mockExamResultsRepository.deleteByExamRequestId.mockRejectedValue(new Error('DB error'))

    await expect(useCase.execute(examRequestId, adminUser)).rejects.toThrow('DB error')
    expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled()
    expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled()
    expect(mockExamRequestsRepository.delete).not.toHaveBeenCalled()
  })

  it('invalidates appointment cache after delete', async () => {
    await useCase.execute(examRequestId, adminUser)

    expect(mockCacheService.del).toHaveBeenCalledWith(`exam-requests:appointment:${appointmentId}`)
  })

  it('does not throw when cache invalidation fails', async () => {
    mockCacheService.del.mockRejectedValue(new Error('redis down'))

    await expect(useCase.execute(examRequestId, adminUser)).resolves.toBeUndefined()
  })

  it('throws NotFoundException when exam request not found', async () => {
    mockExamRequestsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(examRequestId, adminUser)).rejects.toThrow(NotFoundException)
  })

  it('throws ForbiddenException when DOCTOR deletes another doctor exam request', async () => {
    mockDoctorsRepository.findByUserId.mockResolvedValue({ id: 'other-doctor' } as any)

    await expect(useCase.execute(examRequestId, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('throws ForbiddenException when DOCTOR has no doctor profile', async () => {
    mockDoctorsRepository.findByUserId.mockResolvedValue(null)

    await expect(useCase.execute(examRequestId, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('does not delete when RBAC fails', async () => {
    mockDoctorsRepository.findByUserId.mockResolvedValue({ id: 'other-doctor' } as any)

    await expect(useCase.execute(examRequestId, doctorUser)).rejects.toThrow(ForbiddenException)
    expect(mockExamRequestsRepository.delete).not.toHaveBeenCalled()
    expect(mockExamResultsRepository.deleteByExamRequestId).not.toHaveBeenCalled()
  })
})
