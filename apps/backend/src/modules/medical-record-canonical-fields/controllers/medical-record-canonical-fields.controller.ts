import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common'
import {
  CanonicalFieldResponseDto,
  CreateCanonicalFieldDto,
  UpdateCanonicalFieldDto,
  UserRole,
} from '@app/shared'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { Roles } from '../../auth/decorators/roles.decorator'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { CanonicalFieldListQueryDto } from '../dto/canonical-field-list-query.dto'
import { CreateCanonicalFieldUseCase } from '../use-cases/create-canonical-field.use-case'
import { FindCanonicalFieldsUseCase } from '../use-cases/find-canonical-fields.use-case'
import { UpdateCanonicalFieldUseCase } from '../use-cases/update-canonical-field.use-case'

@Controller('medical-record-canonical-fields')
export class MedicalRecordCanonicalFieldsController {
  constructor(
    private readonly findCanonicalFieldsUseCase: FindCanonicalFieldsUseCase,
    private readonly createCanonicalFieldUseCase: CreateCanonicalFieldUseCase,
    private readonly updateCanonicalFieldUseCase: UpdateCanonicalFieldUseCase,
  ) {}

  @Get()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.DOCTOR)
  findAll(
    @Query() query: CanonicalFieldListQueryDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<CanonicalFieldResponseDto[]> {
    return this.findCanonicalFieldsUseCase.execute(query, currentUser)
  }

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN)
  @HttpCode(201)
  create(@Body() dto: CreateCanonicalFieldDto): Promise<CanonicalFieldResponseDto> {
    return this.createCanonicalFieldUseCase.execute(dto)
  }

  @Patch(':id')
  @Roles(UserRole.PLATFORM_ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCanonicalFieldDto,
  ): Promise<CanonicalFieldResponseDto> {
    return this.updateCanonicalFieldUseCase.execute(id, dto)
  }
}
