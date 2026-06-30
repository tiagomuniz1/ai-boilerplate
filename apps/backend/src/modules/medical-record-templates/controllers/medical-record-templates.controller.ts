import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import {
  CreateMedicalRecordTemplateDto,
  MedicalRecordTemplateResponseDto,
  PaginatedMedicalRecordTemplatesResponseDto,
  UpdateMedicalRecordTemplateDto,
  UserRole,
} from '@app/shared'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { Roles } from '../../auth/decorators/roles.decorator'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { MedicalRecordTemplateListQueryDto } from '../dto/medical-record-template-list-query.dto'
import { CreateMedicalRecordTemplateUseCase } from '../use-cases/create-medical-record-template.use-case'
import { UpdateMedicalRecordTemplateUseCase } from '../use-cases/update-medical-record-template.use-case'
import { FindAllMedicalRecordTemplatesUseCase } from '../use-cases/find-all-medical-record-templates.use-case'
import { FindMedicalRecordTemplateByIdUseCase } from '../use-cases/find-medical-record-template-by-id.use-case'
import { DeleteMedicalRecordTemplateUseCase } from '../use-cases/delete-medical-record-template.use-case'

@Controller('medical-record-templates')
export class MedicalRecordTemplatesController {
  constructor(
    private readonly createMedicalRecordTemplateUseCase: CreateMedicalRecordTemplateUseCase,
    private readonly updateMedicalRecordTemplateUseCase: UpdateMedicalRecordTemplateUseCase,
    private readonly findAllMedicalRecordTemplatesUseCase: FindAllMedicalRecordTemplatesUseCase,
    private readonly findMedicalRecordTemplateByIdUseCase: FindMedicalRecordTemplateByIdUseCase,
    private readonly deleteMedicalRecordTemplateUseCase: DeleteMedicalRecordTemplateUseCase,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(201)
  create(
    @Body() dto: CreateMedicalRecordTemplateDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<MedicalRecordTemplateResponseDto> {
    return this.createMedicalRecordTemplateUseCase.execute(dto, currentUser)
  }

  @Get()
  @Roles(UserRole.ADMIN)
  findAll(
    @Query() query: MedicalRecordTemplateListQueryDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<PaginatedMedicalRecordTemplatesResponseDto> {
    return this.findAllMedicalRecordTemplatesUseCase.execute(query, currentUser)
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  findById(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<MedicalRecordTemplateResponseDto> {
    return this.findMedicalRecordTemplateByIdUseCase.execute(id, currentUser)
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMedicalRecordTemplateDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<MedicalRecordTemplateResponseDto> {
    return this.updateMedicalRecordTemplateUseCase.execute(id, dto, currentUser)
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(204)
  delete(@Param('id') id: string, @CurrentUser() currentUser: ICurrentUser): Promise<void> {
    return this.deleteMedicalRecordTemplateUseCase.execute(id, currentUser)
  }
}
