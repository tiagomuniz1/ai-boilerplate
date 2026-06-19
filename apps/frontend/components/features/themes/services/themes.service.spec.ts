jest.mock('@/lib/api-client')

import { apiClient } from '@/lib/api-client'
import { themesService } from './themes.service'

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

describe('themesService', () => {
  beforeEach(() => jest.clearAllMocks())

  it('getAll calls GET /themes with default page=1 and limit=20', async () => {
    mockApiClient.get.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })
    await themesService.getAll()
    expect(mockApiClient.get).toHaveBeenCalledWith('/themes?page=1&limit=20')
  })

  it('getAll calls GET /themes with custom page and limit', async () => {
    mockApiClient.get.mockResolvedValue({ data: [], total: 0, page: 2, limit: 10 })
    await themesService.getAll(2, 10)
    expect(mockApiClient.get).toHaveBeenCalledWith('/themes?page=2&limit=10')
  })

  it('getById calls GET /themes/:id', async () => {
    mockApiClient.get.mockResolvedValue({ id: 'uuid-1' })
    await themesService.getById('uuid-1')
    expect(mockApiClient.get).toHaveBeenCalledWith('/themes/uuid-1')
  })

  it('getActive calls GET /themes/active', async () => {
    mockApiClient.get.mockResolvedValue(null)
    await themesService.getActive()
    expect(mockApiClient.get).toHaveBeenCalledWith('/themes/active')
  })

  it('create calls POST /themes with data', async () => {
    const input = { name: 'Verde', slug: 'verde', accentColor: '#00ff00', accentSoftColor: '#aaffaa', borderRadius: 'md' as any, isDefault: false }
    mockApiClient.post.mockResolvedValue({ id: 'uuid-1' })
    await themesService.create(input)
    expect(mockApiClient.post).toHaveBeenCalledWith('/themes', input)
  })

  it('update calls PATCH /themes/:id with data', async () => {
    const input = { name: 'Verde Escuro' }
    mockApiClient.patch.mockResolvedValue({ id: 'uuid-1' })
    await themesService.update('uuid-1', input)
    expect(mockApiClient.patch).toHaveBeenCalledWith('/themes/uuid-1', input)
  })

  it('remove calls DELETE /themes/:id', async () => {
    mockApiClient.delete.mockResolvedValue(undefined)
    await themesService.remove('uuid-1')
    expect(mockApiClient.delete).toHaveBeenCalledWith('/themes/uuid-1')
  })
})
