jest.mock('../services/users.service')

import { userService } from '../services/users.service'
import { deleteUserUseCase } from './delete-user.use-case'

describe('deleteUserUseCase', () => {
  it('calls userService.remove with id', async () => {
    ;(userService.remove as jest.Mock).mockResolvedValue(undefined)

    await deleteUserUseCase('uuid-1')

    expect(userService.remove).toHaveBeenCalledWith('uuid-1')
  })

  it('propagates errors from userService.remove', async () => {
    const error = { status: 404, title: 'Not Found', detail: 'User not found' }
    ;(userService.remove as jest.Mock).mockRejectedValue(error)

    await expect(deleteUserUseCase('uuid-1')).rejects.toEqual(error)
  })
})
