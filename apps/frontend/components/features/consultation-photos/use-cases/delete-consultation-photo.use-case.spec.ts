jest.mock('../services/consultation-photos.service')

import { consultationPhotosService } from '../services/consultation-photos.service'
import { deleteConsultationPhotoUseCase } from './delete-consultation-photo.use-case'

const mockService = consultationPhotosService as jest.Mocked<typeof consultationPhotosService>

describe('deleteConsultationPhotoUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls consultationPhotosService.remove with the id', async () => {
    mockService.remove.mockResolvedValue(undefined)

    await deleteConsultationPhotoUseCase('photo-uuid')

    expect(mockService.remove).toHaveBeenCalledWith('photo-uuid')
  })
})
