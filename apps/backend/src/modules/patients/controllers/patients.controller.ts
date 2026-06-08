import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common'
import { CreatePatientDto, PaginatedPatientsResponseDto, PatientResponseDto, UpdatePatientDto, UserRole } from '@app/shared'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { Roles } from '../../auth/decorators/roles.decorator'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { ListPatientsQueryDto } from '../dto/list-patients-query.dto'
import { CreatePatientUseCase } from '../use-cases/create-patient.use-case'
import { DeletePatientUseCase } from '../use-cases/delete-patient.use-case'
import { FindPatientByIdUseCase } from '../use-cases/find-patient-by-id.use-case'
import { ListPatientsUseCase } from '../use-cases/list-patients.use-case'
import { UpdatePatientUseCase } from '../use-cases/update-patient.use-case'

@Controller('patients')
export class PatientsController {
  constructor(
    private readonly createPatientUseCase: CreatePatientUseCase,
    private readonly listPatientsUseCase: ListPatientsUseCase,
    private readonly findPatientByIdUseCase: FindPatientByIdUseCase,
    private readonly updatePatientUseCase: UpdatePatientUseCase,
    private readonly deletePatientUseCase: DeletePatientUseCase,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(201)
  create(
    @Body() dto: CreatePatientDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<PatientResponseDto> {
    return this.createPatientUseCase.execute(dto, currentUser)
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.USER)
  findAll(
    @Query() query: ListPatientsQueryDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<PaginatedPatientsResponseDto> {
    return this.listPatientsUseCase.execute(query, currentUser)
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.USER)
  findById(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<PatientResponseDto> {
    return this.findPatientByIdUseCase.execute(id, currentUser)
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<PatientResponseDto> {
    return this.updatePatientUseCase.execute(id, dto, currentUser)
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(204)
  delete(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<void> {
    return this.deletePatientUseCase.execute(id, currentUser)
  }
}
