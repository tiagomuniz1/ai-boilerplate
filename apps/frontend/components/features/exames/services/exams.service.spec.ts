jest.mock('@/lib/api-client')

import { ExamRequestStatus } from '@app/shared'
import { apiClient } from '@/lib/api-client'
import { examsService } from './exams.service'

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

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
  issuedAt: new Date(),
  createdAt: new Date(),
})

describe('examsService', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('getByAppointment', () => {
    it('calls GET /exam-requests?appointmentId=', async () => {
      const dtos = [makeDto()]
      mockApiClient.get.mockResolvedValue(dtos as any)
      const result = await examsService.getByAppointment('appt-uuid')
      expect(mockApiClient.get).toHaveBeenCalledWith('/exam-requests?appointmentId=appt-uuid')
      expect(result).toBe(dtos)
    })
  })

  describe('getById', () => {
    it('calls GET /exam-requests/:id', async () => {
      const dto = makeDto()
      mockApiClient.get.mockResolvedValue(dto as any)
      const result = await examsService.getById('exam-uuid')
      expect(mockApiClient.get).toHaveBeenCalledWith('/exam-requests/exam-uuid')
      expect(result).toBe(dto)
    })
  })

  describe('create', () => {
    it('calls POST /exam-requests with body', async () => {
      const dto = makeDto()
      mockApiClient.post.mockResolvedValue(dto as any)
      const input = { appointmentId: 'appt-uuid', items: [{ name: 'Hemograma' }] }
      const result = await examsService.create(input as any)
      expect(mockApiClient.post).toHaveBeenCalledWith('/exam-requests', input)
      expect(result).toBe(dto)
    })
  })

  describe('remove', () => {
    it('calls DELETE /exam-requests/:id', async () => {
      mockApiClient.delete.mockResolvedValue(undefined as any)
      await examsService.remove('exam-uuid')
      expect(mockApiClient.delete).toHaveBeenCalledWith('/exam-requests/exam-uuid')
    })
  })

  describe('downloadPdf', () => {
    it('calls getBlob /exam-requests/:id/pdf', async () => {
      const blob = new Blob(['%PDF'], { type: 'application/pdf' })
      mockApiClient.getBlob.mockResolvedValue(blob)
      const result = await examsService.downloadPdf('exam-uuid')
      expect(mockApiClient.getBlob).toHaveBeenCalledWith('/exam-requests/exam-uuid/pdf')
      expect(result).toBe(blob)
    })
  })

  describe('addResult', () => {
    it('calls POST /exam-requests/:id/results with multipart FormData containing all files', async () => {
      const dto = makeDto()
      mockApiClient.post.mockResolvedValue(dto as any)
      const files = [
        new File(['a'], 'a.pdf', { type: 'application/pdf' }),
        new File(['b'], 'b.jpg', { type: 'image/jpeg' }),
      ]

      const result = await examsService.addResult('exam-uuid', files)

      expect(mockApiClient.post).toHaveBeenCalledWith('/exam-requests/exam-uuid/results', expect.any(FormData))
      const formData = mockApiClient.post.mock.calls[0][1] as FormData
      expect(formData.getAll('files')).toHaveLength(2)
      expect(result).toBe(dto)
    })
  })

  describe('removeResult', () => {
    it('calls DELETE /exam-results/:id', async () => {
      mockApiClient.delete.mockResolvedValue(undefined as any)
      await examsService.removeResult('result-uuid')
      expect(mockApiClient.delete).toHaveBeenCalledWith('/exam-results/result-uuid')
    })
  })

  describe('downloadResultFile', () => {
    it('calls getBlob /exam-results/:id/file', async () => {
      const blob = new Blob(['%PDF'], { type: 'application/pdf' })
      mockApiClient.getBlob.mockResolvedValue(blob)
      const result = await examsService.downloadResultFile('result-uuid')
      expect(mockApiClient.getBlob).toHaveBeenCalledWith('/exam-results/result-uuid/file')
      expect(result).toBe(blob)
    })
  })
})
