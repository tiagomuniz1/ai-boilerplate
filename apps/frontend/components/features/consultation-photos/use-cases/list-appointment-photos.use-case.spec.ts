jest.mock('../services/consultation-photos.service')

import { consultationPhotosService } from '../services/consultation-photos.service'
import { listAppointmentPhotosUseCase } from './list-appointment-photos.use-case'

const mockService = consultationPhotosService as jest.Mocked<typeof consultationPhotosService>

const makeDto = () => ({
  id: 'photo-uuid',
  appointmentId: 'appointment-uuid',
  fileName: 'evolucao.jpg',
  mimeType: 'image/jpeg',
  fileSizeBytes: 1000,
  createdAt: new Date().toISOString(),
})

describe('listAppointmentPhotosUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('fetches and maps photos for an appointment', async () => {
    mockService.getByAppointment.mockResolvedValue([makeDto()] as any)

    const result = await listAppointmentPhotosUseCase('appointment-uuid')

    expect(mockService.getByAppointment).toHaveBeenCalledWith('appointment-uuid')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('photo-uuid')
  })

  it('returns an empty array when there are no photos', async () => {
    mockService.getByAppointment.mockResolvedValue([])

    const result = await listAppointmentPhotosUseCase('appointment-uuid')

    expect(result).toEqual([])
  })
})
