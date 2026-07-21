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
  CreateMedicationDto,
  MedicationResponseDto,
  PaginatedMedicationsResponseDto,
  UpdateMedicationDto,
  UserRole,
} from '@app/shared'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { Roles } from '../../auth/decorators/roles.decorator'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { MedicationListQueryDto } from '../dto/medication-list-query.dto'
import { CreateMedicationUseCase } from '../use-cases/create-medication.use-case'
import { DeleteMedicationUseCase } from '../use-cases/delete-medication.use-case'
import { FindMedicationsUseCase } from '../use-cases/find-medications.use-case'
import { GetMedicationUseCase } from '../use-cases/get-medication.use-case'
import { UpdateMedicationUseCase } from '../use-cases/update-medication.use-case'

@Controller('medications')
export class MedicationsController {
  constructor(
    private readonly findMedicationsUseCase: FindMedicationsUseCase,
    private readonly getMedicationUseCase: GetMedicationUseCase,
    private readonly createMedicationUseCase: CreateMedicationUseCase,
    private readonly updateMedicationUseCase: UpdateMedicationUseCase,
    private readonly deleteMedicationUseCase: DeleteMedicationUseCase,
  ) {}

  @Get()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.PROFESSIONAL)
  findAll(
    @Query() query: MedicationListQueryDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<PaginatedMedicationsResponseDto> {
    return this.findMedicationsUseCase.execute(query, currentUser)
  }

  @Get(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.PROFESSIONAL)
  findOne(@Param('id') id: string): Promise<MedicationResponseDto> {
    return this.getMedicationUseCase.execute(id)
  }

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN)
  @HttpCode(201)
  create(@Body() dto: CreateMedicationDto): Promise<MedicationResponseDto> {
    return this.createMedicationUseCase.execute(dto)
  }

  @Patch(':id')
  @Roles(UserRole.PLATFORM_ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMedicationDto,
  ): Promise<MedicationResponseDto> {
    return this.updateMedicationUseCase.execute(id, dto)
  }

  @Delete(':id')
  @Roles(UserRole.PLATFORM_ADMIN)
  @HttpCode(204)
  delete(@Param('id') id: string): Promise<void> {
    return this.deleteMedicationUseCase.execute(id)
  }
}
