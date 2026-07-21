jest.mock('@/lib/api-client')

import { apiClient } from '@/lib/api-client'
import { professionalsService } from './professionals.service'

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

const makeDto = () => ({
  id: 'uuid-1',
  user: { id: 'user-uuid-1', fullName: 'Dr. João Silva', email: 'joao@example.com' },
  registrations: [{ id: 'crm-uuid-1', number: '12345', state: 'SP', isPrimary: true }],
  specialties: [{ id: 'spec-uuid-1', name: 'Cardiologia', registryNumber: null }],
  bio: null,
  createdAt: new Date('2024-01-15T10:00:00.000Z'),
  updatedAt: new Date('2024-01-16T10:00:00.000Z'),
})

describe('professionalsService', () => {
  beforeEach(() => jest.clearAllMocks())

  it('getAll calls GET /professionals and returns result', async () => {
    const response = { data: [makeDto()], total: 1, page: 1, limit: 20 }
    mockApiClient.get.mockResolvedValue(response)

    const result = await professionalsService.getAll()

    expect(mockApiClient.get).toHaveBeenCalledWith('/professionals')
    expect(result).toBe(response)
  })

  it('getAll calls GET /professionals with search param', async () => {
    const response = { data: [makeDto()], total: 1, page: 1, limit: 20 }
    mockApiClient.get.mockResolvedValue(response)

    await professionalsService.getAll({ search: 'Cardio' })

    expect(mockApiClient.get).toHaveBeenCalledWith('/professionals?search=Cardio')
  })

  it('getAll calls GET /professionals with page and limit params', async () => {
    const response = { data: [makeDto()], total: 1, page: 2, limit: 10 }
    mockApiClient.get.mockResolvedValue(response)

    await professionalsService.getAll({ page: 2, limit: 10 })

    expect(mockApiClient.get).toHaveBeenCalledWith('/professionals?page=2&limit=10')
  })

  it('getById calls GET /professionals/:id and returns result', async () => {
    const dto = makeDto()
    mockApiClient.get.mockResolvedValue(dto)

    const result = await professionalsService.getById('uuid-1')

    expect(mockApiClient.get).toHaveBeenCalledWith('/professionals/uuid-1')
    expect(result).toBe(dto)
  })

  it('create calls POST /professionals with data and returns result', async () => {
    const dto = makeDto()
    mockApiClient.post.mockResolvedValue(dto)
    const input = {
      userId: 'user-uuid-1',
      registrations: [{ id: 'crm-uuid-1', number: '12345', state: 'SP', isPrimary: true }],
      specialties: [{ specialtyId: 'spec-uuid-1' }],
    }

    const result = await professionalsService.create(input)

    expect(mockApiClient.post).toHaveBeenCalledWith('/professionals', input)
    expect(result).toBe(dto)
  })

  it('update calls PATCH /professionals/:id with data and returns result', async () => {
    const dto = makeDto()
    mockApiClient.patch.mockResolvedValue(dto)
    const input = { specialties: [{ specialtyId: 'spec-uuid-2' }] }

    const result = await professionalsService.update('uuid-1', input)

    expect(mockApiClient.patch).toHaveBeenCalledWith('/professionals/uuid-1', input)
    expect(result).toBe(dto)
  })

  it('remove calls DELETE /professionals/:id', async () => {
    mockApiClient.delete.mockResolvedValue(undefined)

    await professionalsService.remove('uuid-1')

    expect(mockApiClient.delete).toHaveBeenCalledWith('/professionals/uuid-1')
  })
})
