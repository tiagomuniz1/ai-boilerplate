jest.mock('@/lib/api-client')

import { apiClient } from '@/lib/api-client'
import { UserRole } from '@app/shared'
import { userService } from './users.service'

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

const makeDto = () => ({
  id: 'uuid-1',
  fullName: 'Alice Costa',
  email: 'alice@example.com',
  role: UserRole.USER,
  createdAt: new Date('2024-01-15T10:00:00.000Z'),
  updatedAt: new Date('2024-01-16T10:00:00.000Z'),
})

describe('userService', () => {
  beforeEach(() => jest.clearAllMocks())

  it('getAll calls GET /users and returns result', async () => {
    const dtos = [makeDto()]
    mockApiClient.get.mockResolvedValue(dtos)

    const result = await userService.getAll()

    expect(mockApiClient.get).toHaveBeenCalledWith('/users')
    expect(result).toBe(dtos)
  })

  it('getById calls GET /users/:id and returns result', async () => {
    const dto = makeDto()
    mockApiClient.get.mockResolvedValue(dto)

    const result = await userService.getById('uuid-1')

    expect(mockApiClient.get).toHaveBeenCalledWith('/users/uuid-1')
    expect(result).toBe(dto)
  })

  it('create calls POST /users with data and returns result', async () => {
    const dto = makeDto()
    mockApiClient.post.mockResolvedValue(dto)
    const input = { fullName: 'Alice Costa', email: 'alice@example.com', password: 'password123', role: UserRole.USER }

    const result = await userService.create(input)

    expect(mockApiClient.post).toHaveBeenCalledWith('/users', input)
    expect(result).toBe(dto)
  })

  it('update calls PATCH /users/:id with data and returns result', async () => {
    const dto = makeDto()
    mockApiClient.patch.mockResolvedValue(dto)
    const input = { fullName: 'Alice Updated' }

    const result = await userService.update('uuid-1', input)

    expect(mockApiClient.patch).toHaveBeenCalledWith('/users/uuid-1', input)
    expect(result).toBe(dto)
  })

  it('remove calls DELETE /users/:id', async () => {
    mockApiClient.delete.mockResolvedValue(undefined)

    await userService.remove('uuid-1')

    expect(mockApiClient.delete).toHaveBeenCalledWith('/users/uuid-1')
  })
})
