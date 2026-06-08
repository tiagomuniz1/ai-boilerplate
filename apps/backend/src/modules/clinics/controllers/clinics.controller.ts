import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import {
  ClinicResponseDto,
  CreateClinicDto,
  PaginatedClinicsResponseDto,
  RegisterClinicDto,
  RegisterClinicResponseDto,
  UpdateClinicDto,
  UserRole,
} from '@app/shared'
import { Public } from '../../auth/decorators/public.decorator'
import { Roles } from '../../auth/decorators/roles.decorator'
import { ListClinicsQueryDto } from '../dto/list-clinics-query.dto'
import { CreateClinicUseCase } from '../use-cases/create-clinic.use-case'
import { FindAllClinicsUseCase } from '../use-cases/find-all-clinics.use-case'
import { FindClinicByIdUseCase } from '../use-cases/find-clinic-by-id.use-case'
import { RegisterClinicUseCase } from '../use-cases/register-clinic.use-case'
import { UpdateClinicUseCase } from '../use-cases/update-clinic.use-case'

@Controller('clinics')
export class ClinicsController {
  constructor(
    private readonly createClinicUseCase: CreateClinicUseCase,
    private readonly findAllClinicsUseCase: FindAllClinicsUseCase,
    private readonly findClinicByIdUseCase: FindClinicByIdUseCase,
    private readonly registerClinicUseCase: RegisterClinicUseCase,
    private readonly updateClinicUseCase: UpdateClinicUseCase,
  ) {}

  @Post('register')
  @Public()
  @HttpCode(201)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  register(@Body() dto: RegisterClinicDto): Promise<RegisterClinicResponseDto> {
    return this.registerClinicUseCase.execute(dto)
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(201)
  create(@Body() dto: CreateClinicDto): Promise<ClinicResponseDto> {
    return this.createClinicUseCase.execute(dto)
  }

  @Get()
  @Roles(UserRole.ADMIN)
  findAll(@Query() query: ListClinicsQueryDto): Promise<PaginatedClinicsResponseDto> {
    return this.findAllClinicsUseCase.execute(query)
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  findById(@Param('id') id: string): Promise<ClinicResponseDto> {
    return this.findClinicByIdUseCase.execute(id)
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateClinicDto): Promise<ClinicResponseDto> {
    return this.updateClinicUseCase.execute(id, dto)
  }
}
