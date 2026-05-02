jest.mock('../services/users.service')
jest.mock('../mappers/to-user-model.mapper')

import { UserRole } from '@app/shared'
import { userService } from '../services/users.service'
import { toUserModel } from '../mappers/to-user-model.mapper'
import { getUserUseCase } from './get-user.use-case'

describe('getUserUseCase', () => {
  const dto = { id: 'uuid-1', fullName: 'Alice', email: 'alice@example.com', role: UserRole.USER, createdAt: new Date(), updatedAt: new Date() }
  const model = { id: 'uuid-1', fullName: 'Alice', email: 'alice@example.com', role: UserRole.USER, createdAt: new Date(), updatedAt: new Date() }

  it('calls userService.getById with id, maps dto and returns model', async () => {
    ;(userService.getById as jest.Mock).mockResolvedValue(dto)
    ;(toUserModel as jest.Mock).mockReturnValue(model)

    const result = await getUserUseCase('uuid-1')

    expect(userService.getById).toHaveBeenCalledWith('uuid-1')
    expect(toUserModel).toHaveBeenCalledWith(dto)
    expect(result).toBe(model)
  })

  it('propagates errors from userService.getById', async () => {
    const error = { status: 404, title: 'Not Found', detail: 'User not found' }
    ;(userService.getById as jest.Mock).mockRejectedValue(error)

    await expect(getUserUseCase('uuid-1')).rejects.toEqual(error)
  })
})
