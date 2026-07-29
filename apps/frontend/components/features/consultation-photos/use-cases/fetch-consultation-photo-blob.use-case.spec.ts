jest.mock('../services/consultation-photos.service')

import { consultationPhotosService } from '../services/consultation-photos.service'
import { fetchConsultationPhotoBlobUseCase } from './fetch-consultation-photo-blob.use-case'

const mockService = consultationPhotosService as jest.Mocked<typeof consultationPhotosService>

describe('fetchConsultationPhotoBlobUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns the raw blob from the service without creating an object URL', async () => {
    const blob = new Blob(['image-bytes'], { type: 'image/jpeg' })
    mockService.getFileBlob.mockResolvedValue(blob)

    const result = await fetchConsultationPhotoBlobUseCase('photo-uuid')

    expect(mockService.getFileBlob).toHaveBeenCalledWith('photo-uuid')
    expect(result).toBe(blob)
  })
})
