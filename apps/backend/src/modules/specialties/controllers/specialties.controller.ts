import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common'
import {
  CreateSpecialtyDto,
  PaginatedSpecialtiesResponseDto,
  SpecialtyResponseDto,
  UpdateSpecialtyDto,
  UserRole,
} from '@app/shared'
import { Roles } from '../../auth/decorators/roles.decorator'
import { SpecialtyListQueryDto } from '../dto/specialty-list-query.dto'
import { CreateSpecialtyUseCase } from '../use-cases/create-specialty.use-case'
import { DeleteSpecialtyUseCase } from '../use-cases/delete-specialty.use-case'
import { FindAllSpecialtiesUseCase } from '../use-cases/find-all-specialties.use-case'
import { FindSpecialtyByIdUseCase } from '../use-cases/find-specialty-by-id.use-case'
import { UpdateSpecialtyUseCase } from '../use-cases/update-specialty.use-case'

@Controller('specialties')
export class SpecialtiesController {
  constructor(
    private readonly createSpecialtyUseCase: CreateSpecialtyUseCase,
    private readonly findAllSpecialtiesUseCase: FindAllSpecialtiesUseCase,
    private readonly findSpecialtyByIdUseCase: FindSpecialtyByIdUseCase,
    private readonly updateSpecialtyUseCase: UpdateSpecialtyUseCase,
    private readonly deleteSpecialtyUseCase: DeleteSpecialtyUseCase,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(201)
  create(@Body() dto: CreateSpecialtyDto): Promise<SpecialtyResponseDto> {
    return this.createSpecialtyUseCase.execute(dto)
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.USER)
  findAll(@Query() query: SpecialtyListQueryDto): Promise<PaginatedSpecialtiesResponseDto> {
    return this.findAllSpecialtiesUseCase.execute(query)
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.USER)
  findById(@Param('id') id: string): Promise<SpecialtyResponseDto> {
    return this.findSpecialtyByIdUseCase.execute(id)
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateSpecialtyDto): Promise<SpecialtyResponseDto> {
    return this.updateSpecialtyUseCase.execute(id, dto)
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(204)
  delete(@Param('id') id: string): Promise<void> {
    return this.deleteSpecialtyUseCase.execute(id)
  }
}
