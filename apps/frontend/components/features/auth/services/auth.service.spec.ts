jest.mock('@/lib/api-client')

import { apiClient } from '@/lib/api-client'
import { authService } from './auth.service'

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

describe('authService', () => {
  it('calls apiClient.post with /auth/login and input data', async () => {
    const dto = { id: 'uuid-1', fullName: 'Alice Costa', email: 'alice@example.com' }
    mockApiClient.post.mockResolvedValue(dto)

    const input = { email: 'alice@example.com', password: 'password123' }
    const result = await authService.login(input)

    expect(mockApiClient.post).toHaveBeenCalledWith('/auth/login', input)
    expect(result).toEqual(dto)
  })

  it('calls apiClient.post with /auth/logout', async () => {
    mockApiClient.post.mockResolvedValue(undefined)

    await authService.logout()

    expect(mockApiClient.post).toHaveBeenCalledWith('/auth/logout')
  })

  it('returns void on successful logout', async () => {
    mockApiClient.post.mockResolvedValue(undefined)

    const result = await authService.logout()

    expect(result).toBeUndefined()
  })

  it('calls apiClient.get with /auth/me', async () => {
    const dto = { id: 'uuid-1', fullName: 'Alice Costa', email: 'alice@example.com' }
    mockApiClient.get.mockResolvedValue(dto)

    const result = await authService.getMe()

    expect(mockApiClient.get).toHaveBeenCalledWith('/auth/me')
    expect(result).toEqual(dto)
  })
})
