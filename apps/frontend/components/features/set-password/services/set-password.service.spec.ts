jest.mock('@/lib/api-client')

import { apiClient } from '@/lib/api-client'
import { setPasswordService } from './set-password.service'

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

describe('setPasswordService', () => {
  it('validate calls GET with encoded token', async () => {
    const response = { valid: true, email: 'doc@example.com' }
    mockApiClient.get.mockResolvedValue(response)

    const result = await setPasswordService.validate('abc+def=123')

    expect(mockApiClient.get).toHaveBeenCalledWith(
      '/auth/set-password/validate?token=abc%2Bdef%3D123',
    )
    expect(result).toEqual(response)
  })

  it('setPassword calls POST with token and password', async () => {
    mockApiClient.post.mockResolvedValue(undefined)

    await setPasswordService.setPassword({ token: 'tok', password: 'newpass1' })

    expect(mockApiClient.post).toHaveBeenCalledWith('/auth/set-password', {
      token: 'tok',
      password: 'newpass1',
    })
  })
})
