import { UserRole } from '@app/shared'
import { Response } from 'express'
import { PrescriptionsController } from './prescriptions.controller'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { CreatePrescriptionUseCase } from '../use-cases/create-prescription.use-case'
import { FindPrescriptionsByAppointmentUseCase } from '../use-cases/find-prescriptions-by-appointment.use-case'
import { FindPrescriptionByIdUseCase } from '../use-cases/find-prescription-by-id.use-case'
import { DeletePrescriptionUseCase } from '../use-cases/delete-prescription.use-case'
import { GeneratePrescriptionPdfUseCase } from '../use-cases/generate-prescription-pdf.use-case'
import { PrescriptionListQueryDto } from '../dto/prescription-list-query.dto'

const mockCreate = { execute: jest.fn() } as unknown as jest.Mocked<CreatePrescriptionUseCase>
const mockFindByAppointment = { execute: jest.fn() } as unknown as jest.Mocked<FindPrescriptionsByAppointmentUseCase>
const mockFindById = { execute: jest.fn() } as unknown as jest.Mocked<FindPrescriptionByIdUseCase>
const mockDelete = { execute: jest.fn() } as unknown as jest.Mocked<DeletePrescriptionUseCase>
const mockGeneratePdf = { execute: jest.fn() } as unknown as jest.Mocked<GeneratePrescriptionPdfUseCase>

const currentUser: ICurrentUser = { id: 'doctor-uuid', role: UserRole.DOCTOR, clinicId: 'clinic-uuid' }

const makePrescriptionResponse = () => ({
  id: 'rx-uuid',
  appointmentId: 'appt-uuid',
  patientId: 'patient-uuid',
  patientName: 'Patient Jones',
  doctorId: 'doctor-uuid',
  doctorName: 'Doctor Smith',
  issuedAt: new Date(),
  items: [{ medicationId: 'med-uuid', name: 'Dipirona', activeIngredient: null, dosage: null, quantity: null, instructions: 'Tomar 1 cp' }],
  notes: null,
  createdAt: new Date(),
})

describe('PrescriptionsController', () => {
  let controller: PrescriptionsController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new PrescriptionsController(
      mockCreate,
      mockFindByAppointment,
      mockFindById,
      mockDelete,
      mockGeneratePdf,
    )
  })

  it('create delegates to CreatePrescriptionUseCase', async () => {
    const dto = { appointmentId: 'appt-uuid', items: [{ medicationId: 'med-uuid', instructions: 'Tomar 1 cp' }] }
    const response = makePrescriptionResponse()
    mockCreate.execute.mockResolvedValue(response)

    const result = await controller.create(dto as any, currentUser)

    expect(mockCreate.execute).toHaveBeenCalledWith(dto, currentUser)
    expect(result).toBe(response)
  })

  it('findByAppointment delegates to FindPrescriptionsByAppointmentUseCase', async () => {
    const query = Object.assign(new PrescriptionListQueryDto(), { appointmentId: 'appt-uuid' })
    const response = [makePrescriptionResponse()]
    mockFindByAppointment.execute.mockResolvedValue(response)

    const result = await controller.findByAppointment(query, currentUser)

    expect(mockFindByAppointment.execute).toHaveBeenCalledWith('appt-uuid', currentUser)
    expect(result).toBe(response)
  })

  it('findById delegates to FindPrescriptionByIdUseCase', async () => {
    const response = makePrescriptionResponse()
    mockFindById.execute.mockResolvedValue(response)

    const result = await controller.findById('rx-uuid', currentUser)

    expect(mockFindById.execute).toHaveBeenCalledWith('rx-uuid', currentUser)
    expect(result).toBe(response)
  })

  it('delete delegates to DeletePrescriptionUseCase', async () => {
    mockDelete.execute.mockResolvedValue(undefined)

    await controller.delete('rx-uuid', currentUser)

    expect(mockDelete.execute).toHaveBeenCalledWith('rx-uuid', currentUser)
  })

  it('downloadPdf delegates to GeneratePrescriptionPdfUseCase and sends buffer', async () => {
    const buffer = Buffer.from('%PDF-fake')
    mockGeneratePdf.execute.mockResolvedValue(buffer)

    const mockRes = { set: jest.fn(), end: jest.fn() } as unknown as Response

    await controller.downloadPdf('rx-uuid', currentUser, mockRes)

    expect(mockGeneratePdf.execute).toHaveBeenCalledWith('rx-uuid', currentUser)
    expect(mockRes.set).toHaveBeenCalledWith(
      expect.objectContaining({ 'Content-Type': 'application/pdf' }),
    )
    expect(mockRes.end).toHaveBeenCalledWith(buffer)
  })
})
