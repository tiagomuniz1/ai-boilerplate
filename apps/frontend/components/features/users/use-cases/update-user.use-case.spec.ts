jest.mock('../services/users.service')
jest.mock('../mappers/to-user-model.mapper')
jest.mock('../mappers/to-update-user-dto.mapper')

import { UserRole } from '@app/shared'
import { userService } from '../services/users.service'
import { toUserModel } from '../mappers/to-user-model.mapper'
import { toUpdateUserDto } from '../mappers/to-update-user-dto.mapper'
import { updateUserUseCase } from './update-user.use-case'

describe('updateUserUseCase', () => {
  const input = { fullName: 'Alice Updated', role: UserRole.ADMIN }
  const mappedDto = { fullName: 'Alice Updated', role: UserRole.ADMIN }
  const returnedDto = { id: 'uuid-1', fullName: 'Alice Updated', email: 'alice@example.com', role: UserRole.ADMIN, createdAt: new Date(), updatedAt: new Date() }
  const model = { id: 'uuid-1', fullName: 'Alice Updated', email: 'alice@example.com', role: UserRole.ADMIN, createdAt: new Date(), updatedAt: new Date() }

  it('maps input to dto, calls userService.update and returns mapped model', async () => {
    ;(toUpdateUserDto as jest.Mock).mockReturnValue(mappedDto)
    ;(userService.update as jest.Mock).mockResolvedValue(returnedDto)
    ;(toUserModel as jest.Mock).mockReturnValue(model)

    const result = await updateUserUseCase('uuid-1', input)

    expect(toUpdateUserDto).toHaveBeenCalledWith(input)
    expect(userService.update).toHaveBeenCalledWith('uuid-1', mappedDto)
    expect(toUserModel).toHaveBeenCalledWith(returnedDto)
    expect(result).toBe(model)
  })

  it('propagates errors from userService.update', async () => {
    ;(toUpdateUserDto as jest.Mock).mockReturnValue(mappedDto)
    const error = { status: 404, title: 'Not Found', detail: 'User not found' }
    ;(userService.update as jest.Mock).mockRejectedValue(error)

    await expect(updateUserUseCase('uuid-1', input)).rejects.toEqual(error)
  })
})
