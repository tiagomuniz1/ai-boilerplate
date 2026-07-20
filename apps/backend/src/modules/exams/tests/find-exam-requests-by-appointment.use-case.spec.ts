import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { ExamRequestStatus, UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IAppointmentsRepository } from '../../appointments/repositories/appointments.repository.interface'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IExamRequestsRepository } from '../repositories/exam-requests.repository.interface'
import { IExamResultsRepository } from '../repositories/exam-results.repository.interface'
import { FindExamRequestsByAppointmentUseCase } from '../use-cases/find-exam-requests-by-appointment.use-case'
import { CacheService } from '../../../cache/cache.service'

const clinicId = 'clinic-uuid'
const doctorId = 'doctor-uuid'
const appointmentId = 'appt-uuid'

const adminUser: ICurrentUser = { id: 'admin-id', role: UserRole.ADMIN, clinicId }
const doctorUser: ICurrentUser = { id: 'doctor-user-id', role: UserRole.DOCTOR, clinicId }

const makeExamRequest = () => ({
  id: 'exam-uuid',
  clinicId,
  appointmentId,
  patientId: 'patient-uuid',
  doctorId,
  issuedAt: new Date(),
  status: ExamRequestStatus.REQUESTED,
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

const mockAppointmentsRepository: jest.Mocked<IAppointmentsRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findActiveByDoctorAndDate: jest.fn(),
  findActiveBySlot: jest.fn(),
  hasFutureByScheduleId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
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

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  delByPattern: jest.fn(),
  setIfNotExists: jest.fn(),
} as unknown as jest.Mocked<CacheService>

describe('FindExamRequestsByAppointmentUseCase', () => {
  let useCase: FindExamRequestsByAppointmentUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new FindExamRequestsByAppointmentUseCase(
      {} as DataSource,
      mockExamRequestsRepository,
      mockExamResultsRepository,
      mockAppointmentsRepository,
      mockProfessionalsRepository,
      mockCacheService,
    )
    mockExamRequestsRepository.findByAppointment.mockResolvedValue([makeExamRequest() as any])
    mockExamResultsRepository.findByExamRequestIds.mockResolvedValue([])
    mockAppointmentsRepository.findById.mockResolvedValue({ id: appointmentId, doctorId } as any)
    mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: doctorId } as any)
    mockCacheService.get.mockResolvedValue(null)
    mockCacheService.set.mockResolvedValue(undefined)
  })

  it('returns exam requests for ADMIN without RBAC check', async () => {
    const result = await useCase.execute(appointmentId, adminUser)

    expect(result).toHaveLength(1)
    expect(result[0].appointmentId).toBe(appointmentId)
    expect(mockAppointmentsRepository.findById).not.toHaveBeenCalled()
    expect(mockProfessionalsRepository.findByUserId).not.toHaveBeenCalled()
  })

  it('returns exam requests for DOCTOR on own appointment', async () => {
    const result = await useCase.execute(appointmentId, doctorUser)

    expect(result).toHaveLength(1)
    expect(mockProfessionalsRepository.findByUserId).toHaveBeenCalledWith(doctorUser.id, clinicId)
  })

  it('returns cached result on cache hit', async () => {
    const cached = [{ id: 'cached-exam' }]
    mockCacheService.get.mockResolvedValue(cached)

    const result = await useCase.execute(appointmentId, adminUser)

    expect(result).toBe(cached)
    expect(mockExamRequestsRepository.findByAppointment).not.toHaveBeenCalled()
  })

  it('caches result on cache miss', async () => {
    await useCase.execute(appointmentId, adminUser)

    expect(mockCacheService.set).toHaveBeenCalledWith(
      `exam-requests:appointment:${appointmentId}`,
      expect.any(Array),
      60,
    )
  })

  it('throws NotFoundException when DOCTOR accesses non-existent appointment', async () => {
    mockAppointmentsRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute(appointmentId, doctorUser)).rejects.toThrow(NotFoundException)
  })

  it('throws ForbiddenException when DOCTOR accesses another doctor appointment', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue({ id: 'other-doctor' } as any)

    await expect(useCase.execute(appointmentId, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('throws ForbiddenException when DOCTOR has no doctor profile', async () => {
    mockProfessionalsRepository.findByUserId.mockResolvedValue(null)

    await expect(useCase.execute(appointmentId, doctorUser)).rejects.toThrow(ForbiddenException)
  })

  it('does not throw when cache read fails', async () => {
    mockCacheService.get.mockRejectedValue(new Error('redis down'))

    await expect(useCase.execute(appointmentId, adminUser)).resolves.toBeDefined()
  })

  it('does not throw when cache write fails', async () => {
    mockCacheService.set.mockRejectedValue(new Error('redis down'))

    await expect(useCase.execute(appointmentId, adminUser)).resolves.toBeDefined()
  })

  it('aggregates results per exam request without N+1 (single findByExamRequestIds call)', async () => {
    const examResult = {
      id: 'result-uuid',
      examRequestId: 'exam-uuid',
      clinicId,
      filePath: 'exam-results/clinic-uuid/exam-uuid/result-uuid.pdf',
      fileName: 'hemograma.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 1000,
      uploadedByUserId: doctorId,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    }
    mockExamResultsRepository.findByExamRequestIds.mockResolvedValue([examResult] as any)

    const result = await useCase.execute(appointmentId, adminUser)

    expect(mockExamResultsRepository.findByExamRequestIds).toHaveBeenCalledTimes(1)
    expect(mockExamResultsRepository.findByExamRequestIds).toHaveBeenCalledWith(['exam-uuid'], clinicId)
    expect(result[0].results).toHaveLength(1)
    expect(result[0].results[0].id).toBe('result-uuid')
  })

  it('returns results: [] when the exam request has no results', async () => {
    const result = await useCase.execute(appointmentId, adminUser)

    expect(result[0].results).toEqual([])
  })
})
