import { MedicalCertificateType, UserRole } from '@app/shared'
import { Response } from 'express'
import { MedicalCertificatesController } from './medical-certificates.controller'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { CreateMedicalCertificateUseCase } from '../use-cases/create-medical-certificate.use-case'
import { FindMedicalCertificatesByAppointmentUseCase } from '../use-cases/find-medical-certificates-by-appointment.use-case'
import { FindMedicalCertificateByIdUseCase } from '../use-cases/find-medical-certificate-by-id.use-case'
import { DeleteMedicalCertificateUseCase } from '../use-cases/delete-medical-certificate.use-case'
import { GenerateMedicalCertificatePdfUseCase } from '../use-cases/generate-medical-certificate-pdf.use-case'
import { ListMedicalCertificatesQueryDto } from '../dto/list-medical-certificates-query.dto'

const mockCreate = { execute: jest.fn() } as unknown as jest.Mocked<CreateMedicalCertificateUseCase>
const mockFindByAppointment = { execute: jest.fn() } as unknown as jest.Mocked<FindMedicalCertificatesByAppointmentUseCase>
const mockFindById = { execute: jest.fn() } as unknown as jest.Mocked<FindMedicalCertificateByIdUseCase>
const mockDelete = { execute: jest.fn() } as unknown as jest.Mocked<DeleteMedicalCertificateUseCase>
const mockGeneratePdf = { execute: jest.fn() } as unknown as jest.Mocked<GenerateMedicalCertificatePdfUseCase>

const currentUser: ICurrentUser = { id: 'doctor-uuid', role: UserRole.DOCTOR, clinicId: 'clinic-uuid' }

const makeCertificateResponse = () => ({
  id: 'cert-uuid',
  appointmentId: 'appt-uuid',
  patientId: 'patient-uuid',
  patientName: 'Patient Jones',
  doctorId: 'doctor-uuid',
  doctorName: 'Doctor Smith',
  type: MedicalCertificateType.LEAVE,
  daysOff: 3,
  startDate: '2026-01-05',
  cidCode: null,
  attendanceDate: null,
  checkInTime: null,
  checkOutTime: null,
  observations: null,
  issuedAt: new Date(),
  createdAt: new Date(),
})

describe('MedicalCertificatesController', () => {
  let controller: MedicalCertificatesController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new MedicalCertificatesController(
      mockCreate,
      mockFindByAppointment,
      mockFindById,
      mockDelete,
      mockGeneratePdf,
    )
  })

  it('create delegates to CreateMedicalCertificateUseCase', async () => {
    const dto = { appointmentId: 'appt-uuid', type: MedicalCertificateType.LEAVE, daysOff: 3, startDate: '2026-01-05' }
    const response = makeCertificateResponse()
    mockCreate.execute.mockResolvedValue(response)

    const result = await controller.create(dto as any, currentUser)

    expect(mockCreate.execute).toHaveBeenCalledWith(dto, currentUser)
    expect(result).toBe(response)
  })

  it('findByAppointment delegates to FindMedicalCertificatesByAppointmentUseCase', async () => {
    const query = Object.assign(new ListMedicalCertificatesQueryDto(), { appointmentId: 'appt-uuid' })
    const response = [makeCertificateResponse()]
    mockFindByAppointment.execute.mockResolvedValue(response)

    const result = await controller.findByAppointment(query, currentUser)

    expect(mockFindByAppointment.execute).toHaveBeenCalledWith('appt-uuid', currentUser)
    expect(result).toBe(response)
  })

  it('findById delegates to FindMedicalCertificateByIdUseCase', async () => {
    const response = makeCertificateResponse()
    mockFindById.execute.mockResolvedValue(response)

    const result = await controller.findById('cert-uuid', currentUser)

    expect(mockFindById.execute).toHaveBeenCalledWith('cert-uuid', currentUser)
    expect(result).toBe(response)
  })

  it('delete delegates to DeleteMedicalCertificateUseCase', async () => {
    mockDelete.execute.mockResolvedValue(undefined)

    await controller.delete('cert-uuid', currentUser)

    expect(mockDelete.execute).toHaveBeenCalledWith('cert-uuid', currentUser)
  })

  it('downloadPdf delegates to GenerateMedicalCertificatePdfUseCase and sends buffer', async () => {
    const buffer = Buffer.from('%PDF-fake')
    mockGeneratePdf.execute.mockResolvedValue(buffer)

    const mockRes = { set: jest.fn(), end: jest.fn() } as unknown as Response

    await controller.downloadPdf('cert-uuid', currentUser, mockRes)

    expect(mockGeneratePdf.execute).toHaveBeenCalledWith('cert-uuid', currentUser)
    expect(mockRes.set).toHaveBeenCalledWith(
      expect.objectContaining({ 'Content-Type': 'application/pdf' }),
    )
    expect(mockRes.end).toHaveBeenCalledWith(buffer)
  })
})
