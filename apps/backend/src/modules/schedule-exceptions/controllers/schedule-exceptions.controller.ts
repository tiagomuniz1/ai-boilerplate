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
  CreateScheduleExceptionDto,
  PaginatedScheduleExceptionsResponseDto,
  ScheduleExceptionResponseDto,
  UpdateScheduleExceptionDto,
  UserRole,
} from '@app/shared'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { Roles } from '../../auth/decorators/roles.decorator'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { ListScheduleExceptionsQueryDto } from '../dto/list-schedule-exceptions-query.dto'
import { CreateScheduleExceptionUseCase } from '../use-cases/create-schedule-exception.use-case'
import { UpdateScheduleExceptionUseCase } from '../use-cases/update-schedule-exception.use-case'
import { DeleteScheduleExceptionUseCase } from '../use-cases/delete-schedule-exception.use-case'
import { FindScheduleExceptionByIdUseCase } from '../use-cases/find-schedule-exception-by-id.use-case'
import { ListScheduleExceptionsUseCase } from '../use-cases/list-schedule-exceptions.use-case'
import { ScheduleException } from '../entities/schedule-exception.entity'

function toResponse(exception: ScheduleException): ScheduleExceptionResponseDto {
  return {
    id: exception.id,
    doctorId: exception.doctorId,
    date: exception.date,
    startTime: exception.startTime,
    endTime: exception.endTime,
    reason: exception.reason,
    createdAt: exception.createdAt,
    updatedAt: exception.updatedAt,
  }
}

@Controller('schedule-exceptions')
export class ScheduleExceptionsController {
  constructor(
    private readonly createScheduleExceptionUseCase: CreateScheduleExceptionUseCase,
    private readonly updateScheduleExceptionUseCase: UpdateScheduleExceptionUseCase,
    private readonly deleteScheduleExceptionUseCase: DeleteScheduleExceptionUseCase,
    private readonly findScheduleExceptionByIdUseCase: FindScheduleExceptionByIdUseCase,
    private readonly listScheduleExceptionsUseCase: ListScheduleExceptionsUseCase,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  @HttpCode(201)
  async create(
    @Body() dto: CreateScheduleExceptionDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<ScheduleExceptionResponseDto> {
    const exception = await this.createScheduleExceptionUseCase.execute(dto, currentUser)
    return toResponse(exception)
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  findAll(
    @Query() query: ListScheduleExceptionsQueryDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<PaginatedScheduleExceptionsResponseDto> {
    return this.listScheduleExceptionsUseCase.execute(query, currentUser)
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  async findById(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<ScheduleExceptionResponseDto> {
    const exception = await this.findScheduleExceptionByIdUseCase.execute(id, currentUser)
    return toResponse(exception)
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateScheduleExceptionDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<ScheduleExceptionResponseDto> {
    const exception = await this.updateScheduleExceptionUseCase.execute(id, dto, currentUser)
    return toResponse(exception)
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  @HttpCode(204)
  delete(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<void> {
    return this.deleteScheduleExceptionUseCase.execute(id, currentUser)
  }
}
