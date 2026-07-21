jest.mock('../services/exams.service')

import { ExamRequestStatus } from '@app/shared'
import { examsService } from '../services/exams.service'
import { createExamRequestUseCase } from './create-exam-request.use-case'

const mockService = examsService as jest.Mocked<typeof examsService>

const makeDto = () => ({
  id: 'exam-uuid',
  appointmentId: 'appt-uuid',
  patientId: 'patient-uuid',
  patientName: 'Patient',
  professionalId: 'doctor-uuid',
  professionalName: 'Dr. Test',
  items: [{ name: 'Hemograma', observations: null }],
  notes: null,
  status: ExamRequestStatus.REQUESTED,
  results: [],
  issuedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
})

describe('createExamRequestUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('maps input to DTO, calls the service, and maps the response back to a model', async () => {
    mockService.create.mockResolvedValue(makeDto() as any)

    const result = await createExamRequestUseCase({
      appointmentId: 'appt-uuid',
      items: [{ name: 'Hemograma' }],
    })

    expect(mockService.create).toHaveBeenCalledWith({
      appointmentId: 'appt-uuid',
      items: [{ name: 'Hemograma' }],
    })
    expect(result.id).toBe('exam-uuid')
  })
})
