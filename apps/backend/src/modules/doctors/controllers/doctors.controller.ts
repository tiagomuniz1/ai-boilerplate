import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common'
import {
  CreateDoctorDto,
  DoctorResponseDto,
  PaginatedDoctorsResponseDto,
  UpdateDoctorDto,
} from '@app/shared'
import { ListDoctorsQueryDto } from '../dto/list-doctors-query.dto'
import { CreateDoctorUseCase } from '../use-cases/create-doctor.use-case'
import { DeleteDoctorUseCase } from '../use-cases/delete-doctor.use-case'
import { FindAllDoctorsUseCase } from '../use-cases/find-all-doctors.use-case'
import { FindDoctorByIdUseCase } from '../use-cases/find-doctor-by-id.use-case'
import { UpdateDoctorUseCase } from '../use-cases/update-doctor.use-case'

@Controller('doctors')
export class DoctorsController {
  constructor(
    private readonly createDoctorUseCase: CreateDoctorUseCase,
    private readonly findAllDoctorsUseCase: FindAllDoctorsUseCase,
    private readonly findDoctorByIdUseCase: FindDoctorByIdUseCase,
    private readonly updateDoctorUseCase: UpdateDoctorUseCase,
    private readonly deleteDoctorUseCase: DeleteDoctorUseCase,
  ) {}

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateDoctorDto): Promise<DoctorResponseDto> {
    return this.createDoctorUseCase.execute(dto)
  }

  @Get()
  findAll(@Query() query: ListDoctorsQueryDto): Promise<PaginatedDoctorsResponseDto> {
    return this.findAllDoctorsUseCase.execute(query)
  }

  @Get(':id')
  findById(@Param('id') id: string): Promise<DoctorResponseDto> {
    return this.findDoctorByIdUseCase.execute(id)
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDoctorDto,
  ): Promise<DoctorResponseDto> {
    return this.updateDoctorUseCase.execute(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  delete(@Param('id') id: string): Promise<void> {
    return this.deleteDoctorUseCase.execute(id)
  }
}
