import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IPrescriptionsRepository } from '../repositories/prescriptions.repository.interface'
import { FindPrescriptionByIdUseCase } from '../use-cases/find-prescription-by-id.use-case'
import { LogoFetcherService } from '../services/logo-fetcher.service'
import { PrescriptionPdfBuilderService } from '../services/prescription-pdf-builder.service'
import { GeneratePrescriptionPdfUseCase } from '../use-cases/generate-prescription-pdf.use-case'

const clinicId = 'clinic-uuid'
const prescriptionId = 'rx-uuid'

const adminUser: ICurrentUser = { id: 'admin-id', role: UserRole.ADMIN, clinicId }
const doctorUser: ICurrentUser = { id: 'doctor-user-id', role: UserRole.DOCTOR, clinicId }

const makeSnapshot = () => ({
  issuedAt: '2026-01-05T10:00:00.000Z',
  clinic: { name: 'Clínica', address: null, logoUrl: null },
  doctor: { name: 'Dr. Test', crmNumber: '12345/SP', specialtyName: null },
  patient: { name: 'Patient', documentNumber: '12345678901' },
  items: [{ medicationId: 'med', name: 'Dipirona', activeIngredient: null, instructions: 'Tomar 1 cp' }],
  notes: null,
})

const makePrescription = () => ({
  id: prescriptionId,
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
} as unknown as jest.Mocked<FindPrescriptionByIdUseCase>

const mockPrescriptionsRepository: jest.Mocked<IPrescriptionsRepository> = {
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
} as unknown as jest.Mocked<PrescriptionPdfBuilderService>

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
    )
    mockFindByIdUseCase.execute.mockResolvedValue({} as any)
    mockPrescriptionsRepository.findById.mockResolvedValue(makePrescription() as any)
    mockLogoFetcherService.fetchAsBase64.mockResolvedValue(null)
    mockPdfBuilderService.build.mockResolvedValue(PDF_BUFFER)
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

  it('does not fetch logo when logoUrl is null', async () => {
    await useCase.execute(prescriptionId, adminUser)

    expect(mockLogoFetcherService.fetchAsBase64).not.toHaveBeenCalled()
    expect(mockPdfBuilderService.build).toHaveBeenCalledWith(makeSnapshot(), null)
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
    expect(mockPdfBuilderService.build).toHaveBeenCalledWith(snapshotWithLogo, logoBase64)
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
    expect(mockPdfBuilderService.build).toHaveBeenCalledWith(snapshotWithLogo, null)
  })
})
