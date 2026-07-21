import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common'
import {
  CreatePrescriptionTemplateDto,
  PrescriptionTemplateResponseDto,
  UpdatePrescriptionTemplateDto,
  UserRole,
} from '@app/shared'
import { Roles } from '../../auth/decorators/roles.decorator'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { CreatePrescriptionTemplateUseCase } from '../use-cases/create-prescription-template.use-case'
import { FindAllPrescriptionTemplatesUseCase } from '../use-cases/find-all-prescription-templates.use-case'
import { FindPrescriptionTemplateByIdUseCase } from '../use-cases/find-prescription-template-by-id.use-case'
import { UpdatePrescriptionTemplateUseCase } from '../use-cases/update-prescription-template.use-case'
import { DeletePrescriptionTemplateUseCase } from '../use-cases/delete-prescription-template.use-case'

@Controller('prescription-templates')
export class PrescriptionTemplatesController {
  constructor(
    private readonly createPrescriptionTemplateUseCase: CreatePrescriptionTemplateUseCase,
    private readonly findAllPrescriptionTemplatesUseCase: FindAllPrescriptionTemplatesUseCase,
    private readonly findPrescriptionTemplateByIdUseCase: FindPrescriptionTemplateByIdUseCase,
    private readonly updatePrescriptionTemplateUseCase: UpdatePrescriptionTemplateUseCase,
    private readonly deletePrescriptionTemplateUseCase: DeletePrescriptionTemplateUseCase,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  create(
    @Body() dto: CreatePrescriptionTemplateDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<PrescriptionTemplateResponseDto> {
    return this.createPrescriptionTemplateUseCase.execute(dto, currentUser)
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  findAll(
    @CurrentUser() currentUser: ICurrentUser,
    @Query('professionalId') professionalId?: string,
  ): Promise<PrescriptionTemplateResponseDto[]> {
    return this.findAllPrescriptionTemplatesUseCase.execute(currentUser, professionalId)
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  findById(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<PrescriptionTemplateResponseDto> {
    return this.findPrescriptionTemplateByIdUseCase.execute(id, currentUser)
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePrescriptionTemplateDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<PrescriptionTemplateResponseDto> {
    return this.updatePrescriptionTemplateUseCase.execute(id, dto, currentUser)
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  delete(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<void> {
    return this.deletePrescriptionTemplateUseCase.execute(id, currentUser)
  }
}
