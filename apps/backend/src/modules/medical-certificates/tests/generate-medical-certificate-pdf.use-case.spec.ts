import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { MedicalCertificateType, UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IMedicalCertificatesRepository } from '../repositories/medical-certificates.repository.interface'
import { FindMedicalCertificateByIdUseCase } from '../use-cases/find-medical-certificate-by-id.use-case'
import { LogoFetcherService } from '../services/logo-fetcher.service'
import { MedicalCertificatePdfBuilderService } from '../services/medical-certificate-pdf-builder.service'
import { GenerateMedicalCertificatePdfUseCase } from '../use-cases/generate-medical-certificate-pdf.use-case'

const clinicId = 'clinic-uuid'
const certificateId = 'cert-uuid'

const adminUser: ICurrentUser = { id: 'admin-id', role: UserRole.ADMIN, clinicId }
const doctorUser: ICurrentUser = { id: 'doctor-user-id', role: UserRole.DOCTOR, clinicId }

const makeSnapshot = () => ({
  issuedAt: '2026-01-05T10:00:00.000Z',
  type: MedicalCertificateType.LEAVE,
  clinic: { name: 'Clínica', address: null, logoUrl: null },
  doctor: { name: 'Dr. Test', crmNumber: '12345/SP', specialtyName: null },
  patient: { name: 'Patient', documentNumber: '12345678901' },
  daysOff: 3,
  startDate: '2026-01-05',
  cidCode: null,
  attendanceDate: null,
  checkInTime: null,
  checkOutTime: null,
  observations: null,
})

const makeCertificate = () => ({
  id: certificateId,
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
} as unknown as jest.Mocked<FindMedicalCertificateByIdUseCase>

const mockMedicalCertificatesRepository: jest.Mocked<IMedicalCertificatesRepository> = {
  findByAppointment: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
}

const mockLogoFetcherService = {
  fetchAsBase64: jest.fn(),
} as unknown as jest.Mocked<LogoFetcherService>

const mockPdfBuilderService = {
  build: jest.fn(),
} as unknown as jest.Mocked<MedicalCertificatePdfBuilderService>

const PDF_BUFFER = Buffer.from('%PDF-fake')

describe('GenerateMedicalCertificatePdfUseCase', () => {
  let useCase: GenerateMedicalCertificatePdfUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new GenerateMedicalCertificatePdfUseCase(
      {} as DataSource,
      mockFindByIdUseCase,
      mockMedicalCertificatesRepository,
      mockLogoFetcherService,
      mockPdfBuilderService,
    )
    mockFindByIdUseCase.execute.mockResolvedValue({} as any)
    mockMedicalCertificatesRepository.findById.mockResolvedValue(makeCertificate() as any)
    mockLogoFetcherService.fetchAsBase64.mockResolvedValue(null)
    mockPdfBuilderService.build.mockResolvedValue(PDF_BUFFER)
  })

  it('returns PDF buffer for ADMIN', async () => {
    const result = await useCase.execute(certificateId, adminUser)

    expect(result).toBe(PDF_BUFFER)
    expect(mockFindByIdUseCase.execute).toHaveBeenCalledWith(certificateId, adminUser)
  })

  it('returns PDF buffer for DOCTOR', async () => {
    const result = await useCase.execute(certificateId, doctorUser)

    expect(result).toBe(PDF_BUFFER)
    expect(mockFindByIdUseCase.execute).toHaveBeenCalledWith(certificateId, doctorUser)
  })

  it('delegates RBAC to FindMedicalCertificateByIdUseCase', async () => {
    mockFindByIdUseCase.execute.mockRejectedValue(new ForbiddenException())

    await expect(useCase.execute(certificateId, doctorUser)).rejects.toThrow(ForbiddenException)
    expect(mockPdfBuilderService.build).not.toHaveBeenCalled()
  })

  it('propagates NotFoundException from FindMedicalCertificateByIdUseCase', async () => {
    mockFindByIdUseCase.execute.mockRejectedValue(new NotFoundException())

    await expect(useCase.execute(certificateId, adminUser)).rejects.toThrow(NotFoundException)
  })

  it('does not fetch logo when logoUrl is null', async () => {
    await useCase.execute(certificateId, adminUser)

    expect(mockLogoFetcherService.fetchAsBase64).not.toHaveBeenCalled()
    expect(mockPdfBuilderService.build).toHaveBeenCalledWith(makeSnapshot(), null)
  })

  it('fetches logo and passes base64 to builder when logoUrl is set', async () => {
    const logoUrl = 'https://example.com/logo.png'
    const logoBase64 = 'data:image/png;base64,abc123'
    const snapshotWithLogo = { ...makeSnapshot(), clinic: { name: 'Clínica', address: null, logoUrl } }

    mockMedicalCertificatesRepository.findById.mockResolvedValue({
      ...makeCertificate(),
      snapshot: snapshotWithLogo,
    } as any)
    mockLogoFetcherService.fetchAsBase64.mockResolvedValue(logoBase64)

    await useCase.execute(certificateId, adminUser)

    expect(mockLogoFetcherService.fetchAsBase64).toHaveBeenCalledWith(logoUrl)
    expect(mockPdfBuilderService.build).toHaveBeenCalledWith(snapshotWithLogo, logoBase64)
  })

  it('still builds PDF when logo fetch returns null (fallback)', async () => {
    const snapshotWithLogo = {
      ...makeSnapshot(),
      clinic: { name: 'Clínica', address: null, logoUrl: 'https://example.com/logo.png' },
    }
    mockMedicalCertificatesRepository.findById.mockResolvedValue({
      ...makeCertificate(),
      snapshot: snapshotWithLogo,
    } as any)
    mockLogoFetcherService.fetchAsBase64.mockResolvedValue(null)

    const result = await useCase.execute(certificateId, adminUser)

    expect(result).toBe(PDF_BUFFER)
    expect(mockPdfBuilderService.build).toHaveBeenCalledWith(snapshotWithLogo, null)
  })
})
