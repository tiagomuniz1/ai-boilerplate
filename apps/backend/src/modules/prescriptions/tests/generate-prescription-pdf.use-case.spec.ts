import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { CouncilType, UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IPrescriptionsRepository } from '../repositories/prescriptions.repository.interface'
import { FindPrescriptionByIdUseCase } from '../use-cases/find-prescription-by-id.use-case'
import { FindClinicByIdUseCase } from '../../clinics/use-cases/find-clinic-by-id.use-case'
import { LogoFetcherService } from '../services/logo-fetcher.service'
import { PrescriptionPdfBuilderService } from '../services/prescription-pdf-builder.service'
import { GeneratePrescriptionPdfUseCase } from '../use-cases/generate-prescription-pdf.use-case'

process.env.DB_HOST = process.env.DB_HOST ?? 'localhost'
process.env.DB_PORT = process.env.DB_PORT ?? '5432'
process.env.DB_USER = process.env.DB_USER ?? 'postgres'
process.env.DB_PASS = process.env.DB_PASS ?? 'postgres'
process.env.DB_NAME = process.env.DB_NAME ?? 'app'
process.env.DB_SCHEMA = process.env.DB_SCHEMA ?? 'test'
process.env.REDIS_HOST = process.env.REDIS_HOST ?? 'localhost'
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6379'
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-key'
process.env.JWT_EXPIRATION = process.env.JWT_EXPIRATION ?? '900s'
process.env.JWT_REFRESH_EXPIRATION = process.env.JWT_REFRESH_EXPIRATION ?? '7d'
process.env.FRONTEND_URL = 'http://localhost:3000'

const clinicId = 'clinic-uuid'
const prescriptionId = 'rx-uuid'
const verificationToken = 'a'.repeat(64)
const clinicSlug = 'test-clinic'

const adminUser: ICurrentUser = { id: 'admin-id', role: UserRole.ADMIN, clinicId }
const doctorUser: ICurrentUser = { id: 'doctor-user-id', role: UserRole.PROFESSIONAL, clinicId }

const makeSnapshot = () => ({
  issuedAt: '2026-01-05T10:00:00.000Z',
  clinic: { name: 'Clínica', address: null, logoUrl: null },
  professional: { name: 'Dr. Test', councilType: CouncilType.CRM, registrationNumber: '12345/SP', registryNumber: null, specialtyName: null },
  patient: { name: 'Patient', documentNumber: '12345678901' },
  items: [{ medicationId: 'med', name: 'Dipirona', activeIngredient: null, instructions: 'Tomar 1 cp' }],
  notes: null,
})

const makePrescription = () => ({
  id: prescriptionId,
  clinicId,
  appointmentId: 'appt-uuid',
  patientId: 'patient-uuid',
  professionalId: 'doctor-uuid',
  issuedAt: new Date(),
  verificationToken,
  snapshot: makeSnapshot(),
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
})

const expectedUrl = `http://localhost:3000/${clinicSlug}/verify/prescriptions/${verificationToken}`

const mockFindByIdUseCase = {
  execute: jest.fn(),
} as unknown as jest.Mocked<FindPrescriptionByIdUseCase>

const mockPrescriptionsRepository: jest.Mocked<IPrescriptionsRepository> = {
  findByAppointment: jest.fn(),
  findById: jest.fn(),
  findByVerificationToken: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
}

const mockLogoFetcherService = {
  fetchAsBase64: jest.fn(),
} as unknown as jest.Mocked<LogoFetcherService>

const mockPdfBuilderService = {
  build: jest.fn(),
} as unknown as jest.Mocked<PrescriptionPdfBuilderService>

const mockFindClinicByIdUseCase = {
  execute: jest.fn(),
} as unknown as jest.Mocked<FindClinicByIdUseCase>

const PDF_BUFFER = Buffer.from('%PDF-fake')

describe('GeneratePrescriptionPdfUseCase', () => {
  let useCase: GeneratePrescriptionPdfUseCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new GeneratePrescriptionPdfUseCase(
      {} as DataSource,
      mockFindByIdUseCase,
      mockPrescriptionsRepository,
      mockLogoFetcherService,
      mockPdfBuilderService,
      mockFindClinicByIdUseCase,
    )
    mockFindByIdUseCase.execute.mockResolvedValue({} as any)
    mockPrescriptionsRepository.findById.mockResolvedValue(makePrescription() as any)
    mockLogoFetcherService.fetchAsBase64.mockResolvedValue(null)
    mockPdfBuilderService.build.mockResolvedValue(PDF_BUFFER)
    ;(mockFindClinicByIdUseCase.execute as jest.Mock).mockResolvedValue({ id: clinicId, slug: clinicSlug } as any)
  })

  it('returns PDF buffer for ADMIN', async () => {
    const result = await useCase.execute(prescriptionId, adminUser)

    expect(result).toBe(PDF_BUFFER)
    expect(mockFindByIdUseCase.execute).toHaveBeenCalledWith(prescriptionId, adminUser)
  })

  it('returns PDF buffer for DOCTOR', async () => {
    const result = await useCase.execute(prescriptionId, doctorUser)

    expect(result).toBe(PDF_BUFFER)
    expect(mockFindByIdUseCase.execute).toHaveBeenCalledWith(prescriptionId, doctorUser)
  })

  it('delegates RBAC to FindPrescriptionByIdUseCase', async () => {
    mockFindByIdUseCase.execute.mockRejectedValue(new ForbiddenException())

    await expect(useCase.execute(prescriptionId, doctorUser)).rejects.toThrow(ForbiddenException)
    expect(mockPdfBuilderService.build).not.toHaveBeenCalled()
  })

  it('propagates NotFoundException from FindPrescriptionByIdUseCase', async () => {
    mockFindByIdUseCase.execute.mockRejectedValue(new NotFoundException())

    await expect(useCase.execute(prescriptionId, adminUser)).rejects.toThrow(NotFoundException)
  })

  it('builds the clinic-scoped verification URL and passes it to the builder', async () => {
    await useCase.execute(prescriptionId, adminUser)

    expect(mockFindClinicByIdUseCase.execute).toHaveBeenCalledWith(clinicId)
    expect(mockPdfBuilderService.build).toHaveBeenCalledWith(makeSnapshot(), null, expectedUrl)
  })

  it('does not fetch logo when logoUrl is null', async () => {
    await useCase.execute(prescriptionId, adminUser)

    expect(mockLogoFetcherService.fetchAsBase64).not.toHaveBeenCalled()
    expect(mockPdfBuilderService.build).toHaveBeenCalledWith(makeSnapshot(), null, expectedUrl)
  })

  it('fetches logo and passes base64 to builder when logoUrl is set', async () => {
    const logoUrl = 'https://example.com/logo.png'
    const logoBase64 = 'data:image/png;base64,abc123'
    const snapshotWithLogo = { ...makeSnapshot(), clinic: { name: 'Clínica', address: null, logoUrl } }

    mockPrescriptionsRepository.findById.mockResolvedValue({
      ...makePrescription(),
      snapshot: snapshotWithLogo,
    } as any)
    mockLogoFetcherService.fetchAsBase64.mockResolvedValue(logoBase64)

    await useCase.execute(prescriptionId, adminUser)

    expect(mockLogoFetcherService.fetchAsBase64).toHaveBeenCalledWith(logoUrl)
    expect(mockPdfBuilderService.build).toHaveBeenCalledWith(snapshotWithLogo, logoBase64, expectedUrl)
  })

  it('still builds PDF when logo fetch returns null (fallback)', async () => {
    const snapshotWithLogo = {
      ...makeSnapshot(),
      clinic: { name: 'Clínica', address: null, logoUrl: 'https://example.com/logo.png' },
    }
    mockPrescriptionsRepository.findById.mockResolvedValue({
      ...makePrescription(),
      snapshot: snapshotWithLogo,
    } as any)
    mockLogoFetcherService.fetchAsBase64.mockResolvedValue(null)

    const result = await useCase.execute(prescriptionId, adminUser)

    expect(result).toBe(PDF_BUFFER)
    expect(mockPdfBuilderService.build).toHaveBeenCalledWith(snapshotWithLogo, null, expectedUrl)
  })
})
