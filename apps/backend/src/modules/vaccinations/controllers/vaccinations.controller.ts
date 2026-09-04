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
  CreateVaccinationDto,
  PaginatedVaccinationsResponseDto,
  UpdateVaccinationDto,
  UserRole,
  VaccinationResponseDto,
} from '@app/shared'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { Roles } from '../../auth/decorators/roles.decorator'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { VaccinationListQueryDto } from '../dto/vaccination-list-query.dto'
import { CreateVaccinationUseCase } from '../use-cases/create-vaccination.use-case'
import { DeleteVaccinationUseCase } from '../use-cases/delete-vaccination.use-case'
import { FindVaccinationsUseCase } from '../use-cases/find-vaccinations.use-case'
import { UpdateVaccinationUseCase } from '../use-cases/update-vaccination.use-case'

// Caderneta é dado clínico: ADMIN e PROFESSIONAL, nunca a recepção — a mesma
// linha do histórico de prontuários e da galeria de fotos.
@Controller('vaccinations')
export class VaccinationsController {
  constructor(
    private readonly findVaccinationsUseCase: FindVaccinationsUseCase,
    private readonly createVaccinationUseCase: CreateVaccinationUseCase,
    private readonly updateVaccinationUseCase: UpdateVaccinationUseCase,
    private readonly deleteVaccinationUseCase: DeleteVaccinationUseCase,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  findAll(
    @Query() query: VaccinationListQueryDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<PaginatedVaccinationsResponseDto> {
    return this.findVaccinationsUseCase.execute(query, currentUser)
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  @HttpCode(201)
  create(
    @Body() dto: CreateVaccinationDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<VaccinationResponseDto> {
    return this.createVaccinationUseCase.execute(dto, currentUser)
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVaccinationDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<VaccinationResponseDto> {
    return this.updateVaccinationUseCase.execute(id, dto, currentUser)
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  @HttpCode(204)
  remove(@Param('id') id: string, @CurrentUser() currentUser: ICurrentUser): Promise<void> {
    return this.deleteVaccinationUseCase.execute(id, currentUser)
  }
}
