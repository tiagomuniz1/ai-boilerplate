import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IExamRequestsRepository } from '../repositories/exam-requests.repository.interface'
import { FindExamRequestByIdUseCase } from '../use-cases/find-exam-request-by-id.use-case'
import { LogoFetcherService } from '../services/logo-fetcher.service'
import { ExamRequestPdfBuilderService } from '../services/exam-request-pdf-builder.service'
import { GenerateExamRequestPdfUseCase } from '../use-cases/generate-exam-request-pdf.use-case'

const clinicId = 'clinic-uuid'
const examRequestId = 'exam-uuid'

const adminUser: ICurrentUser = { id: 'admin-id', role: UserRole.ADMIN, clinicId }
const doctorUser: ICurrentUser = { id: 'doctor-user-id', role: UserRole.DOCTOR, clinicId }

const makeSnapshot = () => ({
  issuedAt: '2026-01-05T10:00:00.000Z',
  clinic: { name: 'Clínica', address: null, logoUrl: null },
  doctor: { name: 'Dr. Test', crmNumber: '12345/SP', rqe: null, specialtyName: null },
  patient: { name: 'Patient', documentNumber: '12345678901' },
  items: [{ name: 'Hemograma completo', observations: null }],
  notes: null,
})

const makeExamRequest = () => ({
  id: examRequestId,
  clinicId,
  appointmentId: 'appt-uuid',
  patientId: 'patient-uuid',
  doctorId: 'doctor-uuid',
  issuedAt: new Date(),
  snapshot: makeSnapshot(),
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
})

const mockFindByIdUseCase = {
  execute: jest.fn(),
} as unknown as jest.Mocked<FindExamRequestByIdUseCase>

const mockExamRequestsRepository: jest.Mocked<IExamRequestsRepository> = {
  findByAppointment: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  updateStatus: jest.fn(),
  delete: jest.fn(),
}

const mockLogoFetcherService = {
  fetchAsBase64: jest.fn(),
} as unknown as jest.Mocked<LogoFetcherService>

const mockPdfBuilderService = {
  build: jest.fn(),
} as unknown as jest.Mocked<ExamRequestPdfBuilderService>

const PDF_BUFFER = Buffer.from('%PDF-fake')

describe('GenerateExamRequestPdfUseCase', () => {
  let useCase: GenerateExamRequestPdfUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new GenerateExamRequestPdfUseCase(
      {} as DataSource,
      mockFindByIdUseCase,
      mockExamRequestsRepository,
      mockLogoFetcherService,
      mockPdfBuilderService,
    )
    mockFindByIdUseCase.execute.mockResolvedValue({} as any)
    mockExamRequestsRepository.findById.mockResolvedValue(makeExamRequest() as any)
    mockLogoFetcherService.fetchAsBase64.mockResolvedValue(null)
    mockPdfBuilderService.build.mockResolvedValue(PDF_BUFFER)
  })

  it('returns PDF buffer for ADMIN', async () => {
    const result = await useCase.execute(examRequestId, adminUser)

    expect(result).toBe(PDF_BUFFER)
    expect(mockFindByIdUseCase.execute).toHaveBeenCalledWith(examRequestId, adminUser)
  })

  it('returns PDF buffer for DOCTOR', async () => {
    const result = await useCase.execute(examRequestId, doctorUser)

    expect(result).toBe(PDF_BUFFER)
    expect(mockFindByIdUseCase.execute).toHaveBeenCalledWith(examRequestId, doctorUser)
  })

  it('delegates RBAC to FindExamRequestByIdUseCase', async () => {
    mockFindByIdUseCase.execute.mockRejectedValue(new ForbiddenException())

    await expect(useCase.execute(examRequestId, doctorUser)).rejects.toThrow(ForbiddenException)
    expect(mockPdfBuilderService.build).not.toHaveBeenCalled()
  })

  it('propagates NotFoundException from FindExamRequestByIdUseCase', async () => {
    mockFindByIdUseCase.execute.mockRejectedValue(new NotFoundException())

    await expect(useCase.execute(examRequestId, adminUser)).rejects.toThrow(NotFoundException)
  })

  it('does not fetch logo when logoUrl is null', async () => {
    await useCase.execute(examRequestId, adminUser)

    expect(mockLogoFetcherService.fetchAsBase64).not.toHaveBeenCalled()
    expect(mockPdfBuilderService.build).toHaveBeenCalledWith(makeSnapshot(), null)
  })

  it('fetches logo and passes base64 to builder when logoUrl is set', async () => {
    const logoUrl = 'https://example.com/logo.png'
    const logoBase64 = 'data:image/png;base64,abc123'
    const snapshotWithLogo = { ...makeSnapshot(), clinic: { name: 'Clínica', address: null, logoUrl } }

    mockExamRequestsRepository.findById.mockResolvedValue({
      ...makeExamRequest(),
      snapshot: snapshotWithLogo,
    } as any)
    mockLogoFetcherService.fetchAsBase64.mockResolvedValue(logoBase64)

    await useCase.execute(examRequestId, adminUser)

    expect(mockLogoFetcherService.fetchAsBase64).toHaveBeenCalledWith(logoUrl)
    expect(mockPdfBuilderService.build).toHaveBeenCalledWith(snapshotWithLogo, logoBase64)
  })

  it('still builds PDF when logo fetch returns null (fallback)', async () => {
    const snapshotWithLogo = {
      ...makeSnapshot(),
      clinic: { name: 'Clínica', address: null, logoUrl: 'https://example.com/logo.png' },
    }
    mockExamRequestsRepository.findById.mockResolvedValue({
      ...makeExamRequest(),
      snapshot: snapshotWithLogo,
    } as any)
    mockLogoFetcherService.fetchAsBase64.mockResolvedValue(null)

    const result = await useCase.execute(examRequestId, adminUser)

    expect(result).toBe(PDF_BUFFER)
    expect(mockPdfBuilderService.build).toHaveBeenCalledWith(snapshotWithLogo, null)
  })
})
