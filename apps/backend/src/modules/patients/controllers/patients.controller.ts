import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common'
import { CreatePatientDto, PaginatedPatientsResponseDto, PatientResponseDto, UpdatePatientDto } from '@app/shared'
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
  @HttpCode(201)
  create(@Body() dto: CreatePatientDto): Promise<PatientResponseDto> {
    return this.createPatientUseCase.execute(dto)
  }

  @Get()
  findAll(@Query() query: ListPatientsQueryDto): Promise<PaginatedPatientsResponseDto> {
    return this.listPatientsUseCase.execute(query)
  }

  @Get(':id')
  findById(@Param('id') id: string): Promise<PatientResponseDto> {
    return this.findPatientByIdUseCase.execute(id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePatientDto): Promise<PatientResponseDto> {
    return this.updatePatientUseCase.execute(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  delete(@Param('id') id: string): Promise<void> {
    return this.deletePatientUseCase.execute(id)
  }
}
