jest.mock('@/lib/api-client')

import { apiClient } from '@/lib/api-client'
import { consultationPhotosService } from './consultation-photos.service'

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

const makeDto = () => ({
  id: 'photo-uuid',
  appointmentId: 'appointment-uuid',
  fileName: 'evolucao.jpg',
  mimeType: 'image/jpeg',
  fileSizeBytes: 1000,
  createdAt: new Date(),
})

describe('consultationPhotosService', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('getByAppointment', () => {
    it('calls GET /consultation-photos?appointmentId=', async () => {
      const dtos = [makeDto()]
      mockApiClient.get.mockResolvedValue(dtos as any)

      const result = await consultationPhotosService.getByAppointment('appointment-uuid')

      expect(mockApiClient.get).toHaveBeenCalledWith('/consultation-photos?appointmentId=appointment-uuid')
      expect(result).toBe(dtos)
    })
  })

  describe('upload', () => {
    it('calls POST /consultation-photos/appointments/:id with multipart FormData containing all files', async () => {
      const dtos = [makeDto()]
      mockApiClient.post.mockResolvedValue(dtos as any)
      const files = [
        new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
        new File(['b'], 'b.png', { type: 'image/png' }),
      ]

      const result = await consultationPhotosService.upload('appointment-uuid', files)

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/consultation-photos/appointments/appointment-uuid',
        expect.any(FormData),
      )
      const formData = mockApiClient.post.mock.calls[0][1] as FormData
      expect(formData.getAll('files')).toHaveLength(2)
      expect(result).toBe(dtos)
    })
  })

  describe('remove', () => {
    it('calls DELETE /consultation-photos/:id', async () => {
      mockApiClient.delete.mockResolvedValue(undefined as any)
      await consultationPhotosService.remove('photo-uuid')
      expect(mockApiClient.delete).toHaveBeenCalledWith('/consultation-photos/photo-uuid')
    })
  })

  describe('getFileBlob', () => {
    it('calls getBlob /consultation-photos/:id/file', async () => {
      const blob = new Blob(['image-bytes'], { type: 'image/jpeg' })
      mockApiClient.getBlob.mockResolvedValue(blob)

      const result = await consultationPhotosService.getFileBlob('photo-uuid')

      expect(mockApiClient.getBlob).toHaveBeenCalledWith('/consultation-photos/photo-uuid/file')
      expect(result).toBe(blob)
    })
  })

  describe('getByPatient', () => {
    it('calls GET /consultation-photos/by-patient/:id with page and limit', async () => {
      const paginated = { data: [], total: 0, page: 1, limit: 20 }
      mockApiClient.get.mockResolvedValue(paginated as any)

      const result = await consultationPhotosService.getByPatient('patient-uuid', { page: 1, limit: 20 })

      expect(mockApiClient.get).toHaveBeenCalledWith('/consultation-photos/by-patient/patient-uuid?page=1&limit=20')
      expect(result).toBe(paginated)
    })
  })
})
