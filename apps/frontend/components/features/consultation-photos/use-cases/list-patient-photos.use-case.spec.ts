jest.mock('../services/consultation-photos.service')

import { consultationPhotosService } from '../services/consultation-photos.service'
import { listPatientPhotosUseCase } from './list-patient-photos.use-case'

const mockService = consultationPhotosService as jest.Mocked<typeof consultationPhotosService>

const makeDto = () => ({
  id: 'photo-uuid',
  appointmentId: 'appointment-uuid',
  fileName: 'evolucao.jpg',
  mimeType: 'image/jpeg',
  fileSizeBytes: 1000,
  createdAt: new Date().toISOString(),
  professionalName: 'Ana Nutri',
  appointmentDate: new Date().toISOString(),
})

describe('listPatientPhotosUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('fetches and maps a paginated page of patient photos', async () => {
    mockService.getByPatient.mockResolvedValue({
      data: [makeDto()],
      total: 1,
      page: 1,
      limit: 20,
    } as any)

    const result = await listPatientPhotosUseCase('patient-uuid', 1, 20)

    expect(mockService.getByPatient).toHaveBeenCalledWith('patient-uuid', { page: 1, limit: 20 })
    expect(result.data).toHaveLength(1)
    expect(result.data[0].professionalName).toBe('Ana Nutri')
    expect(result.total).toBe(1)
    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
  })

  it('returns an empty page when there are no photos', async () => {
    mockService.getByPatient.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 } as any)

    const result = await listPatientPhotosUseCase('patient-uuid', 1, 20)

    expect(result.data).toEqual([])
    expect(result.total).toBe(0)
  })
})
