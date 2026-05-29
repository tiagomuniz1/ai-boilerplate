jest.mock('@/lib/api-client')

import { apiClient } from '@/lib/api-client'
import { doctorsService } from './doctors.service'

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

const makeDto = () => ({
  id: 'uuid-1',
  user: { id: 'user-uuid-1', fullName: 'Dr. João Silva', email: 'joao@example.com' },
  crmNumber: '12345/SP',
  specialties: [{ id: 'spec-uuid-1', name: 'Cardiologia' }],
  bio: null,
  createdAt: new Date('2024-01-15T10:00:00.000Z'),
  updatedAt: new Date('2024-01-16T10:00:00.000Z'),
})

describe('doctorsService', () => {
  beforeEach(() => jest.clearAllMocks())

  it('getAll calls GET /doctors and returns result', async () => {
    const response = { data: [makeDto()], total: 1, page: 1, limit: 20 }
    mockApiClient.get.mockResolvedValue(response)

    const result = await doctorsService.getAll()

    expect(mockApiClient.get).toHaveBeenCalledWith('/doctors')
    expect(result).toBe(response)
  })

  it('getAll calls GET /doctors with search param', async () => {
    const response = { data: [makeDto()], total: 1, page: 1, limit: 20 }
    mockApiClient.get.mockResolvedValue(response)

    await doctorsService.getAll({ search: 'Cardio' })

    expect(mockApiClient.get).toHaveBeenCalledWith('/doctors?search=Cardio')
  })

  it('getAll calls GET /doctors with page and limit params', async () => {
    const response = { data: [makeDto()], total: 1, page: 2, limit: 10 }
    mockApiClient.get.mockResolvedValue(response)

    await doctorsService.getAll({ page: 2, limit: 10 })

    expect(mockApiClient.get).toHaveBeenCalledWith('/doctors?page=2&limit=10')
  })

  it('getById calls GET /doctors/:id and returns result', async () => {
    const dto = makeDto()
    mockApiClient.get.mockResolvedValue(dto)

    const result = await doctorsService.getById('uuid-1')

    expect(mockApiClient.get).toHaveBeenCalledWith('/doctors/uuid-1')
    expect(result).toBe(dto)
  })

  it('create calls POST /doctors with data and returns result', async () => {
    const dto = makeDto()
    mockApiClient.post.mockResolvedValue(dto)
    const input = {
      userId: 'user-uuid-1',
      crmNumber: '12345/SP',
      specialtyIds: ['spec-uuid-1'],
    }

    const result = await doctorsService.create(input)

    expect(mockApiClient.post).toHaveBeenCalledWith('/doctors', input)
    expect(result).toBe(dto)
  })

  it('update calls PATCH /doctors/:id with data and returns result', async () => {
    const dto = makeDto()
    mockApiClient.patch.mockResolvedValue(dto)
    const input = { specialtyIds: ['spec-uuid-2'] }

    const result = await doctorsService.update('uuid-1', input)

    expect(mockApiClient.patch).toHaveBeenCalledWith('/doctors/uuid-1', input)
    expect(result).toBe(dto)
  })

  it('remove calls DELETE /doctors/:id', async () => {
    mockApiClient.delete.mockResolvedValue(undefined)

    await doctorsService.remove('uuid-1')

    expect(mockApiClient.delete).toHaveBeenCalledWith('/doctors/uuid-1')
  })
})
