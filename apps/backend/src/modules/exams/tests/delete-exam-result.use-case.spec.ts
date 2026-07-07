import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource, QueryRunner } from 'typeorm'
import { ExamRequestStatus, UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { IExamRequestsRepository } from '../repositories/exam-requests.repository.interface'
import { IExamResultsRepository } from '../repositories/exam-results.repository.interface'
import { DeleteExamResultUseCase } from '../use-cases/delete-exam-result.use-case'
import { CacheService } from '../../../cache/cache.service'

const clinicId = 'clinic-uuid'
const doctorId = 'doctor-uuid'
const examRequestId = 'exam-uuid'
const resultId = 'result-uuid'
const appointmentId = 'appt-uuid'

const doctorUser: ICurrentUser = { id: 'doctor-user-id', role: UserRole.DOCTOR, clinicId }

const makeExamResult = (overrides = {}) => ({
  id: resultId,
  clinicId,
  examRequestId,
  filePath: 'exam-results/clinic-uuid/exam-uuid/result-uuid.pdf',
  fileName: 'hemograma.pdf',
  mimeType: 'application/pdf',
  fileSizeBytes: 1024,
  uploadedByUserId: 'doctor-user-id',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

const makeExamRequest = (overrides = {}) => ({
  id: examRequestId,
  clinicId,
  appointmentId,
  patientId: 'patient-uuid',
  doctorId,
  issuedAt: new Date(),
  status: ExamRequestStatus.COMPLETED,
  snapshot: {
    issuedAt: new Date().toISOString(),
    clinic: { name: 'Clinic', address: null, logoUrl: null },
    doctor: { name: 'Doctor', crmNumber: '12345/SP', rqe: null, specialtyName: null },
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

const mockExamResultsRepository: jest.Mocked<IExamResultsRepository> = {
  findByExamRequestIds: jest.fn(),
  findById: jest.fn(),
  countActiveByExamRequest: jest.fn(),
  create: jest.fn(),
  deleteByExamRequestId: jest.fn(),
  delete: jest.fn(),
}

const mockExamRequestsRepository: jest.Mocked<IExamRequestsRepository> = {
  findByAppointment: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  updateStatus: jest.fn(),
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

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  delByPattern: jest.fn(),
  setIfNotExists: jest.fn(),
} as unknown as jest.Mocked<CacheService>

describe('DeleteExamResultUseCase', () => {
  let useCase: DeleteExamResultUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new DeleteExamResultUseCase(
      mockDataSource,
      mockExamResultsRepository,
      mockExamRequestsRepository,
      mockDoctorsRepository,
      mockCacheService,
    )
    mockExamResultsRepository.findById.mockResolvedValue(makeExamResult() as any)
    mockExamRequestsRepository.findById.mockResolvedValue(makeExamRequest() as any)
    mockDoctorsRepository.findByUserId.mockResolvedValue({ id: doctorId } as any)
    mockExamResultsRepository.delete.mockResolvedValue(undefined)
    mockExamResultsRepository.countActiveByExamRequest.mockResolvedValue(0)
    mockExamRequestsRepository.updateStatus.mockResolvedValue(undefined)
    mockCacheService.del.mockResolvedValue(undefined)
  })

  it('reverts status to requested when the removed result was the last active one', async () => {
    mockExamResultsRepository.countActiveByExamRequest.mockResolvedValue(0)

    await useCase.execute(resultId, doctorUser)

    expect(mockExamResultsRepository.delete).toHaveBeenCalledWith(resultId, mockQueryRunner)
    expect(mockExamRequestsRepository.updateStatus).toHaveBeenCalledWith(
      examRequestId,
      ExamRequestStatus.REQUESTED,
      mockQueryRunner,
    )
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled()
  })

  it('keeps status completed when other active results remain', async () => {
    mockExamResultsRepository.countActiveByExamRequest.mockResolvedValue(1)

    await useCase.execute(resultId, doctorUser)

    expect(mockExamResultsRepository.delete).toHaveBeenCalledWith(resultId, mockQueryRunner)
    expect(mockExamRequestsRepository.updateStatus).not.toHaveBeenCalled()
  })

  it('does not revert status when the exam request is not completed', async () => {
    mockExamRequestsRepository.findById.mockResolvedValue(makeExamRequest({ status: ExamRequestStatus.REQUESTED }) as any)
    mockExamResultsRepository.countActiveByExamRequest.mockResolvedValue(0)

    await useCase.execute(resultId, doctorUser)

    expect(mockExamRequestsRepository.updateStatus).not.toHaveBeenCalled()
  })

  it('counts active results after the delete, in the same transaction', async () => {
    await useCase.execute(resultId, doctorUser)

    expect(mockExamResultsRepository.countActiveByExamRequest).toHaveBeenCalledWith(examRequestId, mockQueryRunner)
  })

  it('rolls back the transaction when the delete fails', async () => {
    mockExamResultsRepository.delete.mockRejectedValue(new Error('DB error'))

    await expect(useCase.execute(resultId, doctorUser)).rejects.toThrow('DB error')
    expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled()
    expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled()
  })

  it('invalidates appointment cache after delete', async () => {
    await useCase.execute(resultId, doctorUser)

    expect(mockCacheService.del).toHaveBeenCalledWith(`exam-requests:appointment:${appointmentId}`)
  })

  it('does not throw when cache invalidation fails', async () => {
    mockCacheService.del.mockRejectedValue(new Error('redis down'))

    await expect(useCase.execute(resultId, doctorUser)).resolves.toBeUndefined()
  })

  it('throws NotFoundException when the exam result does not exist', async () => {
    mockExamResultsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(resultId, doctorUser)).rejects.toThrow(NotFoundException)
    expect(mockExamResultsRepository.delete).not.toHaveBeenCalled()
  })

  it('throws NotFoundException when the parent exam request does not exist', async () => {
    mockExamRequestsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(resultId, doctorUser)).rejects.toThrow(NotFoundException)
  })

  it('throws ForbiddenException when DOCTOR is not the owner of the exam request', async () => {
    mockDoctorsRepository.findByUserId.mockResolvedValue({ id: 'other-doctor' } as any)

    await expect(useCase.execute(resultId, doctorUser)).rejects.toThrow(ForbiddenException)
    expect(mockExamResultsRepository.delete).not.toHaveBeenCalled()
  })

  it('throws ForbiddenException when DOCTOR has no doctor profile', async () => {
    mockDoctorsRepository.findByUserId.mockResolvedValue(null)

    await expect(useCase.execute(resultId, doctorUser)).rejects.toThrow(ForbiddenException)
  })
})
