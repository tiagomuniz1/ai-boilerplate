jest.mock('../services/consultation-photos.service')

import { consultationPhotosService } from '../services/consultation-photos.service'
import { uploadConsultationPhotosUseCase } from './upload-consultation-photos.use-case'

const mockService = consultationPhotosService as jest.Mocked<typeof consultationPhotosService>

const makeDto = () => ({
  id: 'photo-uuid',
  appointmentId: 'appointment-uuid',
  fileName: 'evolucao.jpg',
  mimeType: 'image/jpeg',
  fileSizeBytes: 1000,
  createdAt: new Date().toISOString(),
})

describe('uploadConsultationPhotosUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls the service with the files and returns the mapped photos', async () => {
    mockService.upload.mockResolvedValue([makeDto()] as any)
    const files = [new File(['a'], 'evolucao.jpg', { type: 'image/jpeg' })]

    const result = await uploadConsultationPhotosUseCase('appointment-uuid', files)

    expect(mockService.upload).toHaveBeenCalledWith('appointment-uuid', files)
    expect(result).toHaveLength(1)
    expect(result[0].fileName).toBe('evolucao.jpg')
  })
})
