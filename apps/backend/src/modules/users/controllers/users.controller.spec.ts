import { UserRole } from '@app/shared'
import { UsersController } from './users.controller'
import { ActivateUserUseCase } from '../use-cases/activate-user.use-case'
import { CreateUserUseCase } from '../use-cases/create-user.use-case'
import { FindAllUsersUseCase } from '../use-cases/find-all-users.use-case'
import { FindUserByIdUseCase } from '../use-cases/find-user-by-id.use-case'
import { UpdateUserUseCase } from '../use-cases/update-user.use-case'
import { DeleteUserUseCase } from '../use-cases/delete-user.use-case'
import { PaginationDto } from '../../../common/dto/pagination.dto'
import { ICurrentUser } from '../../auth/types/current-user.type'

const mockCreateUser = { execute: jest.fn() } as unknown as jest.Mocked<CreateUserUseCase>
const mockFindAll = { execute: jest.fn() } as unknown as jest.Mocked<FindAllUsersUseCase>
const mockFindById = { execute: jest.fn() } as unknown as jest.Mocked<FindUserByIdUseCase>
const mockUpdate = { execute: jest.fn() } as unknown as jest.Mocked<UpdateUserUseCase>
const mockDelete = { execute: jest.fn() } as unknown as jest.Mocked<DeleteUserUseCase>
const mockActivate = { execute: jest.fn() } as unknown as jest.Mocked<ActivateUserUseCase>

const currentUser: ICurrentUser = { id: 'user-uuid-admin', role: UserRole.ADMIN, clinicId: 'clinic-uuid' }

describe('UsersController', () => {
  let controller: UsersController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new UsersController(mockCreateUser, mockFindAll, mockFindById, mockUpdate, mockDelete, mockActivate)
  })

  it('create delegates to CreateUserUseCase with currentUser', async () => {
    const dto = { fullName: 'Alice', email: 'a@b.com', password: 'Pass1234', role: UserRole.USER }
    const response = { id: 'u1', ...dto, isActive: true, isDoctor: false, isPatient: false, createdAt: new Date(), updatedAt: new Date() }
    mockCreateUser.execute.mockResolvedValue(response)

    const result = await controller.create(dto as any, currentUser)

    expect(mockCreateUser.execute).toHaveBeenCalledWith(dto, currentUser)
    expect(result).toBe(response)
  })

  it('findAll delegates to FindAllUsersUseCase with currentUser', async () => {
    const pagination: PaginationDto = Object.assign(new PaginationDto(), { page: 1, limit: 20 })
    const response = { data: [], total: 0, page: 1, limit: 20 }
    mockFindAll.execute.mockResolvedValue(response)

    const result = await controller.findAll(pagination, currentUser)

    expect(mockFindAll.execute).toHaveBeenCalledWith(pagination, currentUser)
    expect(result).toBe(response)
  })

  it('findById delegates to FindUserByIdUseCase', async () => {
    const response = { id: 'u1', fullName: 'Alice', email: 'a@b.com', role: UserRole.USER, isActive: true, isDoctor: false, isPatient: false, createdAt: new Date(), updatedAt: new Date() }
    mockFindById.execute.mockResolvedValue(response)

    const result = await controller.findById('u1', currentUser)

    expect(mockFindById.execute).toHaveBeenCalledWith('u1', currentUser)
    expect(result).toBe(response)
  })

  it('update delegates to UpdateUserUseCase', async () => {
    const dto = { fullName: 'Bob' }
    const response = { id: 'u1', fullName: 'Bob', email: 'a@b.com', role: UserRole.USER, isActive: true, isDoctor: false, isPatient: false, createdAt: new Date(), updatedAt: new Date() }
    mockUpdate.execute.mockResolvedValue(response)

    const result = await controller.update('u1', dto as any, currentUser)

    expect(mockUpdate.execute).toHaveBeenCalledWith('u1', dto, currentUser)
    expect(result).toBe(response)
  })

  it('activate delegates to ActivateUserUseCase with currentUser', async () => {
    const response = { id: 'u1', fullName: 'Alice', email: 'a@b.com', role: UserRole.USER, isActive: true, isDoctor: false, isPatient: false, createdAt: new Date(), updatedAt: new Date() }
    mockActivate.execute.mockResolvedValue(response)

    const result = await controller.activate('u1', currentUser)

    expect(mockActivate.execute).toHaveBeenCalledWith('u1', currentUser)
    expect(result).toBe(response)
  })

  it('delete delegates to DeleteUserUseCase with full currentUser', async () => {
    mockDelete.execute.mockResolvedValue(undefined)

    await controller.delete('u1', currentUser)

    expect(mockDelete.execute).toHaveBeenCalledWith('u1', currentUser)
  })
})
