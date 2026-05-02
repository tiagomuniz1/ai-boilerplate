jest.mock('../services/users.service')
jest.mock('../mappers/to-user-model.mapper')
jest.mock('../mappers/to-create-user-dto.mapper')

import { UserRole } from '@app/shared'
import { userService } from '../services/users.service'
import { toUserModel } from '../mappers/to-user-model.mapper'
import { toCreateUserDto } from '../mappers/to-create-user-dto.mapper'
import { createUserUseCase } from './create-user.use-case'

describe('createUserUseCase', () => {
  const input = { fullName: 'Alice', email: 'alice@example.com', password: 'password123', role: UserRole.USER }
  const mappedDto = { fullName: 'Alice', email: 'alice@example.com', password: 'password123', role: UserRole.USER }
  const returnedDto = { id: 'uuid-1', fullName: 'Alice', email: 'alice@example.com', role: UserRole.USER, createdAt: new Date(), updatedAt: new Date() }
  const model = { id: 'uuid-1', fullName: 'Alice', email: 'alice@example.com', role: UserRole.USER, createdAt: new Date(), updatedAt: new Date() }

  it('maps input to dto, calls userService.create and returns mapped model', async () => {
    ;(toCreateUserDto as jest.Mock).mockReturnValue(mappedDto)
    ;(userService.create as jest.Mock).mockResolvedValue(returnedDto)
    ;(toUserModel as jest.Mock).mockReturnValue(model)

    const result = await createUserUseCase(input)

    expect(toCreateUserDto).toHaveBeenCalledWith(input)
    expect(userService.create).toHaveBeenCalledWith(mappedDto)
    expect(toUserModel).toHaveBeenCalledWith(returnedDto)
    expect(result).toBe(model)
  })

  it('propagates errors from userService.create', async () => {
    ;(toCreateUserDto as jest.Mock).mockReturnValue(mappedDto)
    const error = { status: 422, title: 'Unprocessable Entity', detail: 'Validation failed', errors: [{ field: 'email', message: 'Email já em uso' }] }
    ;(userService.create as jest.Mock).mockRejectedValue(error)

    await expect(createUserUseCase(input)).rejects.toEqual(error)
  })
})
