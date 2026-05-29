jest.mock('@/lib/api-client')

import { apiClient } from '@/lib/api-client'
import { specialtiesService } from './specialties.service'

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

const makeDto = () => ({
  id: 'uuid-1',
  name: 'Cardiologia',
  description: null,
  createdAt: new Date('2024-01-15T10:00:00.000Z'),
  updatedAt: new Date('2024-01-16T10:00:00.000Z'),
})

describe('specialtiesService', () => {
  beforeEach(() => jest.clearAllMocks())

  it('getAll calls GET /specialties and returns result', async () => {
    const response = { data: [makeDto()], total: 1, page: 1, limit: 20 }
    mockApiClient.get.mockResolvedValue(response)

    const result = await specialtiesService.getAll()

    expect(mockApiClient.get).toHaveBeenCalledWith('/specialties')
    expect(result).toBe(response)
  })

  it('getAll calls GET /specialties with search param', async () => {
    const response = { data: [makeDto()], total: 1, page: 1, limit: 20 }
    mockApiClient.get.mockResolvedValue(response)

    await specialtiesService.getAll({ search: 'Cardio' })

    expect(mockApiClient.get).toHaveBeenCalledWith('/specialties?search=Cardio')
  })

  it('getAll calls GET /specialties with page and limit params', async () => {
    const response = { data: [makeDto()], total: 1, page: 2, limit: 10 }
    mockApiClient.get.mockResolvedValue(response)

    await specialtiesService.getAll({ page: 2, limit: 10 })

    expect(mockApiClient.get).toHaveBeenCalledWith('/specialties?page=2&limit=10')
  })

  it('getById calls GET /specialties/:id and returns result', async () => {
    const dto = makeDto()
    mockApiClient.get.mockResolvedValue(dto)

    const result = await specialtiesService.getById('uuid-1')

    expect(mockApiClient.get).toHaveBeenCalledWith('/specialties/uuid-1')
    expect(result).toBe(dto)
  })

  it('create calls POST /specialties with data and returns result', async () => {
    const dto = makeDto()
    mockApiClient.post.mockResolvedValue(dto)
    const input = { name: 'Cardiologia' }

    const result = await specialtiesService.create(input)

    expect(mockApiClient.post).toHaveBeenCalledWith('/specialties', input)
    expect(result).toBe(dto)
  })

  it('update calls PATCH /specialties/:id with data and returns result', async () => {
    const dto = makeDto()
    mockApiClient.patch.mockResolvedValue(dto)
    const input = { name: 'Neurologia' }

    const result = await specialtiesService.update('uuid-1', input)

    expect(mockApiClient.patch).toHaveBeenCalledWith('/specialties/uuid-1', input)
    expect(result).toBe(dto)
  })

  it('remove calls DELETE /specialties/:id', async () => {
    mockApiClient.delete.mockResolvedValue(undefined)

    await specialtiesService.remove('uuid-1')

    expect(mockApiClient.delete).toHaveBeenCalledWith('/specialties/uuid-1')
  })
})
