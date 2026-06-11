import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import {
  ClinicResponseDto,
  PaginatedClinicsResponseDto,
  RegisterClinicDto,
  RegisterClinicResponseDto,
  UserRole,
} from '@app/shared'
import { Roles } from '../../auth/decorators/roles.decorator'
import { CreateClinicRequestDto } from '../dto/create-clinic-request.dto'
import { ListClinicsQueryDto } from '../dto/list-clinics-query.dto'
import { UpdateClinicRequestDto } from '../dto/update-clinic-request.dto'
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
  @Roles(UserRole.PLATFORM_ADMIN)
  @HttpCode(201)
  register(@Body() dto: RegisterClinicDto): Promise<RegisterClinicResponseDto> {
    return this.registerClinicUseCase.execute(dto)
  }

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN)
  @HttpCode(201)
  create(@Body() dto: CreateClinicRequestDto): Promise<ClinicResponseDto> {
    return this.createClinicUseCase.execute(dto)
  }

  @Get()
  @Roles(UserRole.PLATFORM_ADMIN)
  findAll(@Query() query: ListClinicsQueryDto): Promise<PaginatedClinicsResponseDto> {
    return this.findAllClinicsUseCase.execute(query)
  }

  @Get(':id')
  @Roles(UserRole.PLATFORM_ADMIN)
  findById(@Param('id') id: string): Promise<ClinicResponseDto> {
    return this.findClinicByIdUseCase.execute(id)
  }

  @Patch(':id')
  @Roles(UserRole.PLATFORM_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateClinicRequestDto): Promise<ClinicResponseDto> {
    return this.updateClinicUseCase.execute(id, dto)
  }
}
