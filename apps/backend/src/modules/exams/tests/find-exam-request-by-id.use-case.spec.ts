import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { CouncilType, ExamRequestStatus, UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IExamRequestsRepository } from '../repositories/exam-requests.repository.interface'
import { IExamResultsRepository } from '../repositories/exam-results.repository.interface'
import { FindExamRequestByIdUseCase } from '../use-cases/find-exam-request-by-id.use-case'

const clinicId = 'clinic-uuid'
const professionalId = 'doctor-uuid'
const examRequestId = 'exam-uuid'

const adminUser: ICurrentUser = { id: 'admin-id', role: UserRole.ADMIN, clinicId }
const doctorUser: ICurrentUser = { id: 'doctor-user-id', role: UserRole.PROFESSIONAL, clinicId }

const makeExamRequest = (overrides = {}) => ({
  id: examRequestId,
  clinicId,
  appointmentId: 'appt-uuid',
  patientId: 'patient-uuid',
  professionalId,
  issuedAt: new Date(),
  status: ExamRequestStatus.REQUESTED,
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

const mockProfessionalsRepository: jest.Mocked<IProfessionalsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  findByRegistration: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

describe('FindExamRequestByIdUseCase', () => {
  let useCase: FindExamRequestByIdUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindExamRequestByIdUseCase(
      {} as DataSource,
      mockExamRequestsRepository,
      mockExamResultsRepository,
      mockProfessionalsRepository,
    )
    mockExamRequestsRepository.findById.mockResolvedValue(makeExamRequest() as any)
    mockExamResultsRepository.findByExamRequestIds.mockResolvedValue([])
    mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: professionalId } as any)
  })

  it('returns exam request for ADMIN', async () => {
    const result = await useCase.execute(examRequestId, adminUser)

    expect(result.id).toBe(examRequestId)
    expect(mockProfessionalsRepository.findByUserId).not.toHaveBeenCalled()
  })

  it('returns exam request for DOCTOR on own exam request', async () => {
    const result = await useCase.execute(examRequestId, doctorUser)

    expect(result.id).toBe(examRequestId)
    expect(mockProfessionalsRepository.findByUserId).toHaveBeenCalledWith(doctorUser.id, clinicId)
  })

  it('throws NotFoundException when exam request not found', async () => {
    mockExamRequestsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(examRequestId, adminUser)).rejects.toThrow(NotFoundException)
  })

  it('throws ForbiddenException when DOCTOR accesses another doctor exam request', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: 'other-doctor' } as any)

    await expect(useCase.execute(examRequestId, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('throws ForbiddenException when DOCTOR has no doctor profile', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue(null)

    await expect(useCase.execute(examRequestId, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('maps snapshot fields to response DTO', async () => {
    const result = await useCase.execute(examRequestId, adminUser)

    expect(result.patientName).toBe('Patient')
    expect(result.professionalName).toBe('Doctor')
    expect(result.notes).toBeNull()
    expect(result.status).toBe(ExamRequestStatus.REQUESTED)
  })

  it('returns results: [] when the exam request has no results', async () => {
    const result = await useCase.execute(examRequestId, adminUser)

    expect(result.results).toEqual([])
    expect(mockExamResultsRepository.findByExamRequestIds).toHaveBeenCalledWith([examRequestId], clinicId)
  })

  it('aggregates results when present', async () => {
    const examResult = {
      id: 'result-uuid',
      examRequestId,
      clinicId,
      filePath: 'exam-results/clinic-uuid/exam-uuid/result-uuid.pdf',
      fileName: 'hemograma.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 1000,
      uploadedByUserId: professionalId,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    }
    mockExamResultsRepository.findByExamRequestIds.mockResolvedValue([examResult] as any)

    const result = await useCase.execute(examRequestId, adminUser)

    expect(result.results).toHaveLength(1)
    expect(result.results[0].id).toBe('result-uuid')
  })
})
