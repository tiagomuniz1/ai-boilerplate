jest.mock('@/lib/api-client')

import { apiClient } from '@/lib/api-client'
import { clinicSpecialtiesService } from './clinic-specialties.service'

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

const CLINIC_ID = 'clinic-uuid-1'
const SPECIALTY_ID = 'specialty-uuid-1'

const makeDto = () => ({
  id: 'link-uuid-1',
  clinicId: CLINIC_ID,
  specialtyId: SPECIALTY_ID,
  name: 'Cardiologia',
  description: null,
  linkedAt: new Date('2024-01-15T10:00:00.000Z'),
})

describe('clinicSpecialtiesService', () => {
  beforeEach(() => jest.clearAllMocks())

  it('getAll calls GET /clinics/:clinicId/specialties and returns result', async () => {
    const response = { data: [makeDto()], total: 1, page: 1, limit: 20 }
    mockApiClient.get.mockResolvedValue(response)

    const result = await clinicSpecialtiesService.getAll(CLINIC_ID)

    expect(mockApiClient.get).toHaveBeenCalledWith(`/clinics/${CLINIC_ID}/specialties`)
    expect(result).toBe(response)
  })

  it('getAll calls GET with search param', async () => {
    const response = { data: [makeDto()], total: 1, page: 1, limit: 20 }
    mockApiClient.get.mockResolvedValue(response)

    await clinicSpecialtiesService.getAll(CLINIC_ID, { search: 'Cardio' })

    expect(mockApiClient.get).toHaveBeenCalledWith(
      `/clinics/${CLINIC_ID}/specialties?search=Cardio`,
    )
  })

  it('getAll calls GET with page and limit params', async () => {
    const response = { data: [makeDto()], total: 1, page: 2, limit: 10 }
    mockApiClient.get.mockResolvedValue(response)

    await clinicSpecialtiesService.getAll(CLINIC_ID, { page: 2, limit: 10 })

    expect(mockApiClient.get).toHaveBeenCalledWith(
      `/clinics/${CLINIC_ID}/specialties?page=2&limit=10`,
    )
  })

  it('link calls POST /clinics/:clinicId/specialties/:specialtyId', async () => {
    const dto = makeDto()
    mockApiClient.post.mockResolvedValue(dto)

    const result = await clinicSpecialtiesService.link(CLINIC_ID, SPECIALTY_ID)

    expect(mockApiClient.post).toHaveBeenCalledWith(
      `/clinics/${CLINIC_ID}/specialties/${SPECIALTY_ID}`,
    )
    expect(result).toBe(dto)
  })

  it('unlink calls DELETE /clinics/:clinicId/specialties/:specialtyId', async () => {
    mockApiClient.delete.mockResolvedValue(undefined)

    await clinicSpecialtiesService.unlink(CLINIC_ID, SPECIALTY_ID)

    expect(mockApiClient.delete).toHaveBeenCalledWith(
      `/clinics/${CLINIC_ID}/specialties/${SPECIALTY_ID}`,
    )
  })
})
