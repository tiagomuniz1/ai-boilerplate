import { ExamRequestStatus, UserRole } from '@app/shared'
import { Response } from 'express'
import { ExamRequestsController } from './exam-requests.controller'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { CreateExamRequestUseCase } from '../use-cases/create-exam-request.use-case'
import { FindExamRequestsByAppointmentUseCase } from '../use-cases/find-exam-requests-by-appointment.use-case'
import { FindExamRequestByIdUseCase } from '../use-cases/find-exam-request-by-id.use-case'
import { DeleteExamRequestUseCase } from '../use-cases/delete-exam-request.use-case'
import { GenerateExamRequestPdfUseCase } from '../use-cases/generate-exam-request-pdf.use-case'
import { AddExamResultUseCase } from '../use-cases/add-exam-result.use-case'
import { ListExamRequestsQueryDto } from '../dto/list-exam-requests-query.dto'

const mockCreate = { execute: jest.fn() } as unknown as jest.Mocked<CreateExamRequestUseCase>
const mockFindByAppointment = { execute: jest.fn() } as unknown as jest.Mocked<FindExamRequestsByAppointmentUseCase>
const mockFindById = { execute: jest.fn() } as unknown as jest.Mocked<FindExamRequestByIdUseCase>
const mockDelete = { execute: jest.fn() } as unknown as jest.Mocked<DeleteExamRequestUseCase>
const mockGeneratePdf = { execute: jest.fn() } as unknown as jest.Mocked<GenerateExamRequestPdfUseCase>
const mockAddResult = { execute: jest.fn() } as unknown as jest.Mocked<AddExamResultUseCase>

const currentUser: ICurrentUser = { id: 'doctor-uuid', role: UserRole.DOCTOR, clinicId: 'clinic-uuid' }

const makeExamRequestResponse = () => ({
  id: 'exam-uuid',
  appointmentId: 'appt-uuid',
  patientId: 'patient-uuid',
  patientName: 'Patient Jones',
  doctorId: 'doctor-uuid',
  doctorName: 'Doctor Smith',
  items: [{ name: 'Hemograma', observations: null }],
  notes: null,
  status: ExamRequestStatus.REQUESTED,
  results: [],
  issuedAt: new Date(),
  createdAt: new Date(),
})

describe('ExamRequestsController', () => {
  let controller: ExamRequestsController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new ExamRequestsController(
      mockCreate,
      mockFindByAppointment,
      mockFindById,
      mockDelete,
      mockGeneratePdf,
      mockAddResult,
    )
  })

  it('create delegates to CreateExamRequestUseCase', async () => {
    const dto = { appointmentId: 'appt-uuid', items: [{ name: 'Hemograma' }] }
    const response = makeExamRequestResponse()
    mockCreate.execute.mockResolvedValue(response)

    const result = await controller.create(dto as any, currentUser)

    expect(mockCreate.execute).toHaveBeenCalledWith(dto, currentUser)
    expect(result).toBe(response)
  })

  it('findByAppointment delegates to FindExamRequestsByAppointmentUseCase', async () => {
    const query = Object.assign(new ListExamRequestsQueryDto(), { appointmentId: 'appt-uuid' })
    const response = [makeExamRequestResponse()]
    mockFindByAppointment.execute.mockResolvedValue(response)

    const result = await controller.findByAppointment(query, currentUser)

    expect(mockFindByAppointment.execute).toHaveBeenCalledWith('appt-uuid', currentUser)
    expect(result).toBe(response)
  })

  it('findById delegates to FindExamRequestByIdUseCase', async () => {
    const response = makeExamRequestResponse()
    mockFindById.execute.mockResolvedValue(response)

    const result = await controller.findById('exam-uuid', currentUser)

    expect(mockFindById.execute).toHaveBeenCalledWith('exam-uuid', currentUser)
    expect(result).toBe(response)
  })

  it('delete delegates to DeleteExamRequestUseCase', async () => {
    mockDelete.execute.mockResolvedValue(undefined)

    await controller.delete('exam-uuid', currentUser)

    expect(mockDelete.execute).toHaveBeenCalledWith('exam-uuid', currentUser)
  })

  it('downloadPdf delegates to GenerateExamRequestPdfUseCase and sends buffer', async () => {
    const buffer = Buffer.from('%PDF-fake')
    mockGeneratePdf.execute.mockResolvedValue(buffer)

    const mockRes = { set: jest.fn(), end: jest.fn() } as unknown as Response

    await controller.downloadPdf('exam-uuid', currentUser, mockRes)

    expect(mockGeneratePdf.execute).toHaveBeenCalledWith('exam-uuid', currentUser)
    expect(mockRes.set).toHaveBeenCalledWith(
      expect.objectContaining({ 'Content-Type': 'application/pdf' }),
    )
    expect(mockRes.end).toHaveBeenCalledWith(buffer)
  })

  it('addResult delegates to AddExamResultUseCase', async () => {
    const files = [{ originalname: 'result.pdf' } as Express.Multer.File]
    const response = { ...makeExamRequestResponse(), status: ExamRequestStatus.COMPLETED }
    mockAddResult.execute.mockResolvedValue(response)

    const result = await controller.addResult('exam-uuid', files, currentUser)

    expect(mockAddResult.execute).toHaveBeenCalledWith('exam-uuid', files, currentUser)
    expect(result).toBe(response)
  })
})
