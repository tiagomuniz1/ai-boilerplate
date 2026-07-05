jest.mock('@/lib/api-client')

import { apiClient } from '@/lib/api-client'
import { prescriptionVerificationService } from './prescription-verification.service'

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

describe('prescriptionVerificationService', () => {
  beforeEach(() => jest.clearAllMocks())

  it('getByToken calls GET /prescriptions/verify/:token and returns result', async () => {
    const response = { clinicName: 'Clínica', items: [] } as any
    mockApiClient.get.mockResolvedValue(response)

    const result = await prescriptionVerificationService.getByToken('token-123')

    expect(mockApiClient.get).toHaveBeenCalledWith('/prescriptions/verify/token-123')
    expect(result).toBe(response)
  })
})
