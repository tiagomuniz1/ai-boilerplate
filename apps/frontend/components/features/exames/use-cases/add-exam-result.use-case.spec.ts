jest.mock('../services/exams.service')

import { ExamRequestStatus } from '@app/shared'
import { examsService } from '../services/exams.service'
import { addExamResultUseCase } from './add-exam-result.use-case'

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
  status: ExamRequestStatus.COMPLETED,
  results: [
    {
      id: 'result-uuid',
      examRequestId: 'exam-uuid',
      fileName: 'hemograma.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 1024,
      createdAt: new Date().toISOString(),
    },
  ],
  issuedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
})

describe('addExamResultUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls the service with the files and returns the updated model', async () => {
    mockService.addResult.mockResolvedValue(makeDto() as any)
    const files = [new File(['a'], 'hemograma.pdf', { type: 'application/pdf' })]

    const result = await addExamResultUseCase('exam-uuid', files)

    expect(mockService.addResult).toHaveBeenCalledWith('exam-uuid', files)
    expect(result.status).toBe(ExamRequestStatus.COMPLETED)
    expect(result.results).toHaveLength(1)
  })
})
