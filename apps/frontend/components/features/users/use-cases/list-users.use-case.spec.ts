jest.mock('../services/users.service')
jest.mock('../mappers/to-user-model.mapper')

import { UserRole } from '@app/shared'
import { userService } from '../services/users.service'
import { toUserModel } from '../mappers/to-user-model.mapper'
import { listUsersUseCase } from './list-users.use-case'

const makeDtoList = () => [
  { id: 'uuid-1', fullName: 'Alice', email: 'alice@example.com', role: UserRole.USER, createdAt: new Date(), updatedAt: new Date() },
]
const makeModelList = () => [
  { id: 'uuid-1', fullName: 'Alice', email: 'alice@example.com', role: UserRole.USER, createdAt: new Date(), updatedAt: new Date() },
]

describe('listUsersUseCase', () => {
  it('calls userService.getAll, maps each dto and returns models', async () => {
    const dtos = makeDtoList()
    const models = makeModelList()
    ;(userService.getAll as jest.Mock).mockResolvedValue({ data: dtos, total: 1, page: 1, limit: 20 })
    ;(toUserModel as jest.Mock).mockReturnValue(models[0])

    const result = await listUsersUseCase()

    expect(userService.getAll).toHaveBeenCalled()
    const [firstArg] = (toUserModel as jest.Mock).mock.calls[0]
    expect(firstArg).toEqual(dtos[0])
    expect(result).toEqual(models)
  })

  it('propagates errors from userService.getAll', async () => {
    const error = { status: 500, title: 'Internal Error', detail: 'Server error' }
    ;(userService.getAll as jest.Mock).mockRejectedValue(error)

    await expect(listUsersUseCase()).rejects.toEqual(error)
  })
})
