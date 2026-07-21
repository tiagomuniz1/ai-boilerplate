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
import { CreateScheduleDto, PaginatedSchedulesResponseDto, ScheduleResponseDto, UpdateScheduleDto, UserRole } from '@app/shared'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { Roles } from '../../auth/decorators/roles.decorator'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { ListSchedulesQueryDto } from '../dto/list-schedules-query.dto'
import { CreateScheduleUseCase } from '../use-cases/create-schedule.use-case'
import { UpdateScheduleUseCase } from '../use-cases/update-schedule.use-case'
import { DeleteScheduleUseCase } from '../use-cases/delete-schedule.use-case'
import { FindScheduleByIdUseCase } from '../use-cases/find-schedule-by-id.use-case'
import { ListSchedulesUseCase } from '../use-cases/list-schedules.use-case'

@Controller('schedules')
export class SchedulesController {
  constructor(
    private readonly createScheduleUseCase: CreateScheduleUseCase,
    private readonly updateScheduleUseCase: UpdateScheduleUseCase,
    private readonly deleteScheduleUseCase: DeleteScheduleUseCase,
    private readonly findScheduleByIdUseCase: FindScheduleByIdUseCase,
    private readonly listSchedulesUseCase: ListSchedulesUseCase,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  @HttpCode(201)
  create(
    @Body() dto: CreateScheduleDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<ScheduleResponseDto> {
    return this.createScheduleUseCase.execute(dto, currentUser)
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  findAll(
    @Query() query: ListSchedulesQueryDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<PaginatedSchedulesResponseDto> {
    return this.listSchedulesUseCase.execute(query, currentUser)
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  findById(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<ScheduleResponseDto> {
    return this.findScheduleByIdUseCase.execute(id, currentUser)
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateScheduleDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<ScheduleResponseDto> {
    return this.updateScheduleUseCase.execute(id, dto, currentUser)
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  @HttpCode(204)
  delete(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<void> {
    return this.deleteScheduleUseCase.execute(id, currentUser)
  }
}
