import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common'
import {
  CreateDoctorDto,
  DoctorResponseDto,
  PaginatedDoctorsResponseDto,
  UpdateDoctorDto,
  UserRole,
} from '@app/shared'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { Roles } from '../../auth/decorators/roles.decorator'
import { ICurrentUser } from '../../auth/types/current-user.type'
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
  @Roles(UserRole.ADMIN)
  @HttpCode(201)
  create(
    @Body() dto: CreateDoctorDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<DoctorResponseDto> {
    return this.createDoctorUseCase.execute(dto, currentUser)
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.USER)
  findAll(
    @Query() query: ListDoctorsQueryDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<PaginatedDoctorsResponseDto> {
    return this.findAllDoctorsUseCase.execute(query, currentUser)
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.USER)
  findById(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<DoctorResponseDto> {
    return this.findDoctorByIdUseCase.execute(id, currentUser)
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDoctorDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<DoctorResponseDto> {
    return this.updateDoctorUseCase.execute(id, dto, currentUser)
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(204)
  delete(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<void> {
    return this.deleteDoctorUseCase.execute(id, currentUser)
  }
}
