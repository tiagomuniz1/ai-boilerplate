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
  CreateVaccineDto,
  PaginatedVaccinesResponseDto,
  UpdateVaccineDto,
  UserRole,
  VaccineResponseDto,
} from '@app/shared'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { Roles } from '../../auth/decorators/roles.decorator'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { VaccineListQueryDto } from '../dto/vaccine-list-query.dto'
import { CreateVaccineUseCase } from '../use-cases/create-vaccine.use-case'
import { DeleteVaccineUseCase } from '../use-cases/delete-vaccine.use-case'
import { FindVaccinesUseCase } from '../use-cases/find-vaccines.use-case'
import { GetVaccineUseCase } from '../use-cases/get-vaccine.use-case'
import { UpdateVaccineUseCase } from '../use-cases/update-vaccine.use-case'

@Controller('vaccines')
export class VaccinesController {
  constructor(
    private readonly findVaccinesUseCase: FindVaccinesUseCase,
    private readonly getVaccineUseCase: GetVaccineUseCase,
    private readonly createVaccineUseCase: CreateVaccineUseCase,
    private readonly updateVaccineUseCase: UpdateVaccineUseCase,
    private readonly deleteVaccineUseCase: DeleteVaccineUseCase,
  ) {}

  // Catálogo curado pelo PLATFORM_ADMIN. ADMIN e PROFESSIONAL leem para
  // escolher a vacina ao registrar uma dose — mesma divisão de `medications`.
  @Get()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.PROFESSIONAL)
  findAll(
    @Query() query: VaccineListQueryDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<PaginatedVaccinesResponseDto> {
    return this.findVaccinesUseCase.execute(query, currentUser)
  }

  @Get(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.PROFESSIONAL)
  findOne(@Param('id') id: string): Promise<VaccineResponseDto> {
    return this.getVaccineUseCase.execute(id)
  }

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN)
  @HttpCode(201)
  create(@Body() dto: CreateVaccineDto): Promise<VaccineResponseDto> {
    return this.createVaccineUseCase.execute(dto)
  }

  @Patch(':id')
  @Roles(UserRole.PLATFORM_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateVaccineDto): Promise<VaccineResponseDto> {
    return this.updateVaccineUseCase.execute(id, dto)
  }

  @Delete(':id')
  @Roles(UserRole.PLATFORM_ADMIN)
  @HttpCode(204)
  remove(@Param('id') id: string): Promise<void> {
    return this.deleteVaccineUseCase.execute(id)
  }
}
