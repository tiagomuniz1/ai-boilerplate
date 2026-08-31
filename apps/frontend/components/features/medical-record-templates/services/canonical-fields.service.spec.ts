jest.mock('@/lib/api-client')

import { apiClient } from '@/lib/api-client'
import { canonicalFieldsService } from './canonical-fields.service'

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

describe('canonicalFieldsService', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('getAll', () => {
    it('calls GET /medical-record-canonical-fields without params', async () => {
      mockApiClient.get.mockResolvedValue([])
      await canonicalFieldsService.getAll()
      expect(mockApiClient.get).toHaveBeenCalledWith('/medical-record-canonical-fields')
    })

    // O catálogo é global: a listagem nunca leva parâmetro de escopo.
    it('never sends a scoping query param', async () => {
      mockApiClient.get.mockResolvedValue([])
      await canonicalFieldsService.getAll()
      expect(mockApiClient.get).toHaveBeenCalledWith(
        expect.not.stringContaining('?'),
      )
    })

    it('returns API response', async () => {
      const response = [{ id: 'uuid-1', canonicalKey: 'weight', label: 'Peso' }]
      mockApiClient.get.mockResolvedValue(response)
      const result = await canonicalFieldsService.getAll()
      expect(result).toBe(response)
    })
  })
})
