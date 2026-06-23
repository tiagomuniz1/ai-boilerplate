jest.mock('../services/dashboard.service')
jest.mock('../mappers/to-dashboard-model')

import { dashboardService } from '../services/dashboard.service'
import { toDashboardModel } from '../mappers/to-dashboard-model'
import { getDashboardStatsUseCase } from './get-dashboard-stats.use-case'
import type { IDashboardModel } from '../types/dashboard.types'

const mockService = dashboardService as jest.Mocked<typeof dashboardService>
const mockMapper = toDashboardModel as jest.MockedFunction<typeof toDashboardModel>

const fakeModel = { kpi: { scheduled: 5 } } as unknown as IDashboardModel

describe('getDashboardStatsUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls service and maps the result', async () => {
    mockService.getStats.mockResolvedValue({} as any)
    mockMapper.mockReturnValue(fakeModel)

    const result = await getDashboardStatsUseCase({ from: '2026-01-01', to: '2026-01-31' })

    expect(mockService.getStats).toHaveBeenCalledWith({ from: '2026-01-01', to: '2026-01-31' })
    expect(mockMapper).toHaveBeenCalled()
    expect(result).toBe(fakeModel)
  })

  it('uses empty filters by default', async () => {
    mockService.getStats.mockResolvedValue({} as any)
    mockMapper.mockReturnValue(fakeModel)

    await getDashboardStatsUseCase()

    expect(mockService.getStats).toHaveBeenCalledWith({})
  })

  it('propagates service errors', async () => {
    mockService.getStats.mockRejectedValue(new Error('network'))

    await expect(getDashboardStatsUseCase()).rejects.toThrow('network')
  })
})
