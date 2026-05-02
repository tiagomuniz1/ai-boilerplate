import { UserRole } from '@app/shared'
import { UsersController } from './users.controller'
import { CreateUserUseCase } from '../use-cases/create-user.use-case'
import { FindAllUsersUseCase } from '../use-cases/find-all-users.use-case'
import { FindUserByIdUseCase } from '../use-cases/find-user-by-id.use-case'
import { UpdateUserUseCase } from '../use-cases/update-user.use-case'
import { DeleteUserUseCase } from '../use-cases/delete-user.use-case'
import { PaginationDto } from '../../../common/dto/pagination.dto'

const mockCreateUser = { execute: jest.fn() } as unknown as jest.Mocked<CreateUserUseCase>
const mockFindAll = { execute: jest.fn() } as unknown as jest.Mocked<FindAllUsersUseCase>
const mockFindById = { execute: jest.fn() } as unknown as jest.Mocked<FindUserByIdUseCase>
const mockUpdate = { execute: jest.fn() } as unknown as jest.Mocked<UpdateUserUseCase>
const mockDelete = { execute: jest.fn() } as unknown as jest.Mocked<DeleteUserUseCase>

describe('UsersController', () => {
  let controller: UsersController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new UsersController(mockCreateUser, mockFindAll, mockFindById, mockUpdate, mockDelete)
  })

  it('create delegates to CreateUserUseCase', async () => {
    const dto = { fullName: 'Alice', email: 'a@b.com', password: 'Pass1234', role: UserRole.USER }
    const response = { id: 'u1', ...dto, createdAt: new Date(), updatedAt: new Date() }
    mockCreateUser.execute.mockResolvedValue(response)

    const result = await controller.create(dto as any)

    expect(mockCreateUser.execute).toHaveBeenCalledWith(dto)
    expect(result).toBe(response)
  })

  it('findAll delegates to FindAllUsersUseCase', async () => {
    const pagination: PaginationDto = Object.assign(new PaginationDto(), { page: 1, limit: 20 })
    const response = { data: [], total: 0, page: 1, limit: 20 }
    mockFindAll.execute.mockResolvedValue(response)

    const result = await controller.findAll(pagination)

    expect(mockFindAll.execute).toHaveBeenCalledWith(pagination)
    expect(result).toBe(response)
  })

  it('findById delegates to FindUserByIdUseCase', async () => {
    const response = { id: 'u1', fullName: 'Alice', email: 'a@b.com', role: UserRole.USER, createdAt: new Date(), updatedAt: new Date() }
    mockFindById.execute.mockResolvedValue(response)

    const result = await controller.findById('u1')

    expect(mockFindById.execute).toHaveBeenCalledWith('u1')
    expect(result).toBe(response)
  })

  it('update delegates to UpdateUserUseCase', async () => {
    const dto = { fullName: 'Bob' }
    const response = { id: 'u1', fullName: 'Bob', email: 'a@b.com', role: UserRole.USER, createdAt: new Date(), updatedAt: new Date() }
    mockUpdate.execute.mockResolvedValue(response)

    const result = await controller.update('u1', dto as any)

    expect(mockUpdate.execute).toHaveBeenCalledWith('u1', dto)
    expect(result).toBe(response)
  })

  it('delete delegates to DeleteUserUseCase', async () => {
    mockDelete.execute.mockResolvedValue(undefined)

    await controller.delete('u1')

    expect(mockDelete.execute).toHaveBeenCalledWith('u1')
  })
})
