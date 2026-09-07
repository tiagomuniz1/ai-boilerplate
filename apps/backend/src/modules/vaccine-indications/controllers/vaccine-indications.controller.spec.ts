import { Response } from 'express'
import { UserRole } from '@app/shared'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { VaccineIndicationsController } from './vaccine-indications.controller'
import { CreateVaccineIndicationUseCase } from '../use-cases/create-vaccine-indication.use-case'
import { FindVaccineIndicationsByAppointmentUseCase } from '../use-cases/find-vaccine-indications-by-appointment.use-case'
import { FindVaccineIndicationByIdUseCase } from '../use-cases/find-vaccine-indication-by-id.use-case'
import { DeleteVaccineIndicationUseCase } from '../use-cases/delete-vaccine-indication.use-case'
import { GenerateVaccineIndicationPdfUseCase } from '../use-cases/generate-vaccine-indication-pdf.use-case'

const mockCreate = { execute: jest.fn() } as unknown as jest.Mocked<CreateVaccineIndicationUseCase>
const mockFindByAppointment = { execute: jest.fn() } as unknown as jest.Mocked<FindVaccineIndicationsByAppointmentUseCase>
const mockFindById = { execute: jest.fn() } as unknown as jest.Mocked<FindVaccineIndicationByIdUseCase>
const mockDelete = { execute: jest.fn() } as unknown as jest.Mocked<DeleteVaccineIndicationUseCase>
const mockGeneratePdf = { execute: jest.fn() } as unknown as jest.Mocked<GenerateVaccineIndicationPdfUseCase>

const currentUser: ICurrentUser = { id: 'professional-uuid', role: UserRole.PROFESSIONAL, clinicId: 'clinic-uuid' }

const makeResponse = () => ({
  id: 'indication-uuid',
  appointmentId: 'appointment-uuid',
  patientId: 'patient-uuid',
  patientName: 'Clara Monteiro Alves',
  professionalId: 'professional-uuid',
  professionalName: 'Dra. Helena Vasconcelos',
  items: [{ vaccineId: 'v1', name: 'Tríplice viral', abbreviation: 'SCR', doseLabel: '1ª dose', instructions: null }],
  notes: null,
  issuedAt: new Date(),
  createdAt: new Date(),
})

describe('VaccineIndicationsController', () => {
  let controller: VaccineIndicationsController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new VaccineIndicationsController(
      mockCreate, mockFindByAppointment, mockFindById, mockDelete, mockGeneratePdf,
    )
  })

  it('create delega ao use-case', async () => {
    const dto = { appointmentId: 'appointment-uuid', items: [{ vaccineId: 'v1' }] }
    mockCreate.execute.mockResolvedValue(makeResponse())

    const result = await controller.create(dto as any, currentUser)

    expect(mockCreate.execute).toHaveBeenCalledWith(dto, currentUser)
    expect(result.id).toBe('indication-uuid')
  })

  it('findByAppointment repassa só o appointmentId da query', async () => {
    mockFindByAppointment.execute.mockResolvedValue([makeResponse()])

    const result = await controller.findByAppointment({ appointmentId: 'appointment-uuid' }, currentUser)

    expect(mockFindByAppointment.execute).toHaveBeenCalledWith('appointment-uuid', currentUser)
    expect(result).toHaveLength(1)
  })

  it('findById delega ao use-case', async () => {
    mockFindById.execute.mockResolvedValue(makeResponse())
    await controller.findById('indication-uuid', currentUser)
    expect(mockFindById.execute).toHaveBeenCalledWith('indication-uuid', currentUser)
  })

  it('delete delega ao use-case', async () => {
    mockDelete.execute.mockResolvedValue(undefined)
    await controller.delete('indication-uuid', currentUser)
    expect(mockDelete.execute).toHaveBeenCalledWith('indication-uuid', currentUser)
  })

  it('downloadPdf devolve o PDF como anexo', async () => {
    const buffer = Buffer.from('%PDF-1.4')
    mockGeneratePdf.execute.mockResolvedValue(buffer)
    const res = { set: jest.fn(), end: jest.fn() } as unknown as Response

    await controller.downloadPdf('indication-uuid', currentUser, res)

    expect(res.set).toHaveBeenCalledWith({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="indicacao-vacina-indication-uuid.pdf"',
      'Content-Length': buffer.length,
    })
    expect(res.end).toHaveBeenCalledWith(buffer)
  })
})
