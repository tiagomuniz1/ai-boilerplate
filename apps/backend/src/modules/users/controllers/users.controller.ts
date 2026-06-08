import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common'
import { CreateUserDto, PaginatedUsersResponseDto, UpdateUserDto, UserResponseDto, UserRole } from '@app/shared'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { Roles } from '../../auth/decorators/roles.decorator'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { ListUsersQueryDto } from '../dto/list-users-query.dto'
import { ActivateUserUseCase } from '../use-cases/activate-user.use-case'
import { CreateUserUseCase } from '../use-cases/create-user.use-case'
import { DeleteUserUseCase } from '../use-cases/delete-user.use-case'
import { FindAllUsersUseCase } from '../use-cases/find-all-users.use-case'
import { FindUserByIdUseCase } from '../use-cases/find-user-by-id.use-case'
import { UpdateUserUseCase } from '../use-cases/update-user.use-case'

@Controller('users')
export class UsersController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly findAllUsersUseCase: FindAllUsersUseCase,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
    private readonly activateUserUseCase: ActivateUserUseCase,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(201)
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<UserResponseDto> {
    return this.createUserUseCase.execute(dto, currentUser)
  }

  @Get()
  @Roles(UserRole.ADMIN)
  findAll(
    @Query() query: ListUsersQueryDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<PaginatedUsersResponseDto> {
    return this.findAllUsersUseCase.execute(query, currentUser)
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.USER)
  findById(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<UserResponseDto> {
    return this.findUserByIdUseCase.execute(id, currentUser)
  }

  @Patch(':id/activate')
  @Roles(UserRole.ADMIN)
  activate(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<UserResponseDto> {
    return this.activateUserUseCase.execute(id, currentUser)
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.USER)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<UserResponseDto> {
    return this.updateUserUseCase.execute(id, dto, currentUser)
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(204)
  delete(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<void> {
    return this.deleteUserUseCase.execute(id, currentUser)
  }
}
