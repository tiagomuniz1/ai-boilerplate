jest.mock('@/lib/api-client')

import { apiClient } from '@/lib/api-client'
import { scheduleExceptionsService } from './schedule-exceptions.service'

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

describe('scheduleExceptionsService', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('getAll', () => {
    it('calls GET /schedule-exceptions without query string when no params provided', async () => {
      mockApiClient.get.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })
      await scheduleExceptionsService.getAll()
      expect(mockApiClient.get).toHaveBeenCalledWith('/schedule-exceptions')
    })

    it('calls GET /schedule-exceptions with doctorId param', async () => {
      mockApiClient.get.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })
      await scheduleExceptionsService.getAll({ doctorId: 'doc-uuid' })
      expect(mockApiClient.get).toHaveBeenCalledWith('/schedule-exceptions?doctorId=doc-uuid')
    })

    it('calls GET /schedule-exceptions with from and to params', async () => {
      mockApiClient.get.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })
      await scheduleExceptionsService.getAll({ from: '2024-01-01', to: '2024-01-31' })
      expect(mockApiClient.get).toHaveBeenCalledWith('/schedule-exceptions?from=2024-01-01&to=2024-01-31')
    })

    it('calls GET /schedule-exceptions with page and limit params', async () => {
      mockApiClient.get.mockResolvedValue({ data: [], total: 0, page: 2, limit: 10 })
      await scheduleExceptionsService.getAll({ page: 2, limit: 10 })
      expect(mockApiClient.get).toHaveBeenCalledWith('/schedule-exceptions?page=2&limit=10')
    })

    it('calls GET /schedule-exceptions with all params combined', async () => {
      mockApiClient.get.mockResolvedValue({ data: [], total: 0, page: 2, limit: 10 })
      await scheduleExceptionsService.getAll({ doctorId: 'doc-uuid', from: '2024-01-01', to: '2024-01-31', page: 2, limit: 10 })
      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/schedule-exceptions?doctorId=doc-uuid&from=2024-01-01&to=2024-01-31&page=2&limit=10',
      )
    })
  })

  it('create calls POST /schedule-exceptions with data', async () => {
    const data = { doctorId: 'doc-uuid', date: '2024-01-15', isAllDay: true } as any
    mockApiClient.post.mockResolvedValue({ id: 'uuid-1' })
    const result = await scheduleExceptionsService.create(data)
    expect(mockApiClient.post).toHaveBeenCalledWith('/schedule-exceptions', data)
    expect(result).toEqual({ id: 'uuid-1' })
  })

  it('update calls PATCH /schedule-exceptions/:id with data', async () => {
    const data = { isAllDay: false } as any
    mockApiClient.patch.mockResolvedValue({ id: 'uuid-1' })
    const result = await scheduleExceptionsService.update('uuid-1', data)
    expect(mockApiClient.patch).toHaveBeenCalledWith('/schedule-exceptions/uuid-1', data)
    expect(result).toEqual({ id: 'uuid-1' })
  })

  it('remove calls DELETE /schedule-exceptions/:id', async () => {
    mockApiClient.delete.mockResolvedValue(undefined)
    await scheduleExceptionsService.remove('uuid-1')
    expect(mockApiClient.delete).toHaveBeenCalledWith('/schedule-exceptions/uuid-1')
  })
})
