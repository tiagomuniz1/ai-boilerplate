import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common'
import { CreateUserDto, PaginatedUsersResponseDto, UpdateUserDto, UserResponseDto } from '@app/shared'
import { PaginationDto } from '../../../common/dto/pagination.dto'
import { Public } from '../../auth/decorators/public.decorator'
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
  ) { }

  @Post()
  @Public()
  @HttpCode(201)
  create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.createUserUseCase.execute(dto)
  }

  @Get()
  findAll(@Query() pagination: PaginationDto): Promise<PaginatedUsersResponseDto> {
    return this.findAllUsersUseCase.execute(pagination)
  }

  @Get(':id')
  findById(@Param('id') id: string): Promise<UserResponseDto> {
    return this.findUserByIdUseCase.execute(id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto): Promise<UserResponseDto> {
    return this.updateUserUseCase.execute(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  delete(@Param('id') id: string): Promise<void> {
    return this.deleteUserUseCase.execute(id)
  }
}
