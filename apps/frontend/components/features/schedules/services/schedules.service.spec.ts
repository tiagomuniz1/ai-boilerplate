jest.mock('@/lib/api-client')

import { apiClient } from '@/lib/api-client'
import { DayOfWeek } from '@app/shared'
import { schedulesService } from './schedules.service'

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

describe('schedulesService', () => {
  beforeEach(() => jest.clearAllMocks())

  it('getAll calls GET /schedules without query when no params', () => {
    mockApiClient.get.mockResolvedValue({} as any)
    schedulesService.getAll()
    expect(mockApiClient.get).toHaveBeenCalledWith('/schedules')
  })

  it('getAll appends professionalId to query string', () => {
    mockApiClient.get.mockResolvedValue({} as any)
    schedulesService.getAll({ professionalId: 'doc-uuid' })
    expect(mockApiClient.get).toHaveBeenCalledWith('/schedules?professionalId=doc-uuid')
  })

  it('getAll appends dayOfWeek and activeOn to query string', () => {
    mockApiClient.get.mockResolvedValue({} as any)
    schedulesService.getAll({ dayOfWeek: DayOfWeek.MONDAY, activeOn: '2025-06-01' })
    expect(mockApiClient.get).toHaveBeenCalledWith('/schedules?dayOfWeek=MONDAY&activeOn=2025-06-01')
  })

  it('getAll appends page and limit to query string', () => {
    mockApiClient.get.mockResolvedValue({} as any)
    schedulesService.getAll({ page: 2, limit: 10 })
    expect(mockApiClient.get).toHaveBeenCalledWith('/schedules?page=2&limit=10')
  })

  it('getById calls GET /schedules/:id', () => {
    mockApiClient.get.mockResolvedValue({} as any)
    schedulesService.getById('some-uuid')
    expect(mockApiClient.get).toHaveBeenCalledWith('/schedules/some-uuid')
  })

  it('create calls POST /schedules with data', () => {
    mockApiClient.post.mockResolvedValue({} as any)
    const data = { dayOfWeek: DayOfWeek.TUESDAY, startTime: '08:00', endTime: '12:00', slotDurationInMinutes: 30 }
    schedulesService.create(data)
    expect(mockApiClient.post).toHaveBeenCalledWith('/schedules', data)
  })

  it('update calls PATCH /schedules/:id with data', () => {
    mockApiClient.patch.mockResolvedValue({} as any)
    schedulesService.update('some-uuid', { startTime: '09:00' })
    expect(mockApiClient.patch).toHaveBeenCalledWith('/schedules/some-uuid', { startTime: '09:00' })
  })

  it('remove calls DELETE /schedules/:id', () => {
    mockApiClient.delete.mockResolvedValue(undefined)
    schedulesService.remove('some-uuid')
    expect(mockApiClient.delete).toHaveBeenCalledWith('/schedules/some-uuid')
  })
})
