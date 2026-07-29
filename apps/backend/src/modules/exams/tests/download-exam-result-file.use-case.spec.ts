import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { CouncilType, ExamRequestStatus, UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IStorageAdapter } from '../../../common/adapters/storage.adapter.interface'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IExamRequestsRepository } from '../repositories/exam-requests.repository.interface'
import { IExamResultsRepository } from '../repositories/exam-results.repository.interface'
import { DownloadExamResultFileUseCase } from '../use-cases/download-exam-result-file.use-case'

const clinicId = 'clinic-uuid'
const professionalId = 'doctor-uuid'
const examRequestId = 'exam-uuid'
const resultId = 'result-uuid'

const adminUser: ICurrentUser = { id: 'admin-id', role: UserRole.ADMIN, clinicId }
const doctorUser: ICurrentUser = { id: 'doctor-user-id', role: UserRole.PROFESSIONAL, clinicId }

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
  appointmentId: 'appt-uuid',
  patientId: 'patient-uuid',
  professionalId,
  issuedAt: new Date(),
  status: ExamRequestStatus.COMPLETED,
  snapshot: {
    issuedAt: new Date().toISOString(),
    clinic: { name: 'Clinic', address: null, logoUrl: null },
    professional: { name: 'Doctor', councilType: CouncilType.CRM, registrationNumber: '12345/SP', registryNumber: null, specialtyName: null },
    patient: { name: 'Patient', documentNumber: '12345678900' },
    items: [],
    notes: null,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

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

const mockProfessionalsRepository: jest.Mocked<IProfessionalsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByRegistration: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

const mockStorageAdapter: jest.Mocked<IStorageAdapter> = {
  upload: jest.fn(),
  download: jest.fn(),
  remove: jest.fn(),
}

describe('DownloadExamResultFileUseCase', () => {
  let useCase: DownloadExamResultFileUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new DownloadExamResultFileUseCase(
      {} as DataSource,
      mockExamResultsRepository,
      mockExamRequestsRepository,
      mockProfessionalsRepository,
      mockStorageAdapter,
    )
    mockExamResultsRepository.findById.mockResolvedValue(makeExamResult() as any)
    mockExamRequestsRepository.findById.mockResolvedValue(makeExamRequest() as any)
    mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: professionalId } as any)
    mockStorageAdapter.download.mockResolvedValue(Buffer.from('file-bytes'))
  })

  it('returns the file buffer, name and mime type for ADMIN', async () => {
    const result = await useCase.execute(resultId, adminUser)

    expect(result.buffer.toString()).toBe('file-bytes')
    expect(result.fileName).toBe('hemograma.pdf')
    expect(result.mimeType).toBe('application/pdf')
    expect(mockProfessionalsRepository.findByUserId).not.toHaveBeenCalled()
  })

  it('returns the file for DOCTOR who owns the exam request', async () => {
    const result = await useCase.execute(resultId, doctorUser)

    expect(result.buffer.toString()).toBe('file-bytes')
    expect(mockProfessionalsRepository.findByUserId).toHaveBeenCalledWith(doctorUser.id, clinicId)
  })

  it('downloads using the stored filePath, scoped to the storage adapter (never a public URL)', async () => {
    await useCase.execute(resultId, adminUser)

    expect(mockStorageAdapter.download).toHaveBeenCalledWith('exam-results/clinic-uuid/exam-uuid/result-uuid.pdf')
  })

  it('throws NotFoundException when the exam result does not exist', async () => {
    mockExamResultsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(resultId, adminUser)).rejects.toThrow(NotFoundException)
    expect(mockStorageAdapter.download).not.toHaveBeenCalled()
  })

  it('throws NotFoundException when the parent exam request does not exist', async () => {
    mockExamRequestsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(resultId, adminUser)).rejects.toThrow(NotFoundException)
    expect(mockStorageAdapter.download).not.toHaveBeenCalled()
  })

  it('throws ForbiddenException when DOCTOR is not the owner of the exam request', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: 'other-doctor' } as any)

    await expect(useCase.execute(resultId, doctorUser)).rejects.toThrow(ForbiddenException)
    expect(mockStorageAdapter.download).not.toHaveBeenCalled()
  })

  it('throws ForbiddenException when DOCTOR has no doctor profile', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue(null)

    await expect(useCase.execute(resultId, doctorUser)).rejects.toThrow(ForbiddenException)
    expect(mockStorageAdapter.download).not.toHaveBeenCalled()
  })
})
