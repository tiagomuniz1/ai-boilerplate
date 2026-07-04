jest.mock('../services/exams.service')

import { ExamRequestStatus } from '@app/shared'
import { examsService } from '../services/exams.service'
import { listExamRequestsUseCase } from './list-exam-requests.use-case'

const mockService = examsService as jest.Mocked<typeof examsService>

const makeDto = () => ({
  id: 'exam-uuid',
  appointmentId: 'appt-uuid',
  patientId: 'patient-uuid',
  patientName: 'Patient',
  doctorId: 'doctor-uuid',
  doctorName: 'Dr. Test',
  items: [{ name: 'Hemograma', observations: null }],
  notes: null,
  status: ExamRequestStatus.REQUESTED,
  results: [],
  issuedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
})

describe('listExamRequestsUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('fetches and maps exam requests for an appointment', async () => {
    mockService.getByAppointment.mockResolvedValue([makeDto()] as any)

    const result = await listExamRequestsUseCase('appt-uuid')

    expect(mockService.getByAppointment).toHaveBeenCalledWith('appt-uuid')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('exam-uuid')
  })

  it('returns an empty array when there are no exam requests', async () => {
    mockService.getByAppointment.mockResolvedValue([])

    const result = await listExamRequestsUseCase('appt-uuid')

    expect(result).toEqual([])
  })
})
