jest.mock('@/lib/api-client')

import { apiClient } from '@/lib/api-client'
import { dashboardService } from './dashboard.service'

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

describe('dashboardService', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls /dashboard with no params when filters are empty', async () => {
    mockApiClient.get.mockResolvedValue({} as any)
    await dashboardService.getStats({})
    expect(mockApiClient.get).toHaveBeenCalledWith('/dashboard')
  })

  it('appends from, to and doctorId to the URL', async () => {
    mockApiClient.get.mockResolvedValue({} as any)
    await dashboardService.getStats({ from: '2026-01-01', to: '2026-01-31', doctorId: 'doc-uuid' })
    expect(mockApiClient.get).toHaveBeenCalledWith(
      '/dashboard?from=2026-01-01&to=2026-01-31&doctorId=doc-uuid',
    )
  })

  it('appends only from when to is missing', async () => {
    mockApiClient.get.mockResolvedValue({} as any)
    await dashboardService.getStats({ from: '2026-01-01' })
    expect(mockApiClient.get).toHaveBeenCalledWith('/dashboard?from=2026-01-01')
  })
})
