import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common'
import {
  AppointmentResponseDto,
  AvailabilityResponseDto,
  CancelAppointmentDto,
  CreateAppointmentDto,
  PaginatedAppointmentsResponseDto,
  UserRole,
} from '@app/shared'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { Roles } from '../../auth/decorators/roles.decorator'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { AvailabilityQueryDto } from '../dto/availability-query.dto'
import { ListAppointmentsQueryDto } from '../dto/list-appointments-query.dto'
import { CancelAppointmentUseCase } from '../use-cases/cancel-appointment.use-case'
import { CompleteAppointmentUseCase } from '../use-cases/complete-appointment.use-case'
import { CreateAppointmentUseCase } from '../use-cases/create-appointment.use-case'
import { FindAppointmentByIdUseCase } from '../use-cases/find-appointment-by-id.use-case'
import { GetAvailabilityUseCase } from '../use-cases/get-availability.use-case'
import { ListAppointmentsUseCase } from '../use-cases/list-appointments.use-case'

@Controller('appointments')
export class AppointmentsController {
  constructor(
    private readonly createAppointmentUseCase: CreateAppointmentUseCase,
    private readonly cancelAppointmentUseCase: CancelAppointmentUseCase,
    private readonly completeAppointmentUseCase: CompleteAppointmentUseCase,
    private readonly findAppointmentByIdUseCase: FindAppointmentByIdUseCase,
    private readonly listAppointmentsUseCase: ListAppointmentsUseCase,
    private readonly getAvailabilityUseCase: GetAvailabilityUseCase,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  @HttpCode(201)
  create(
    @Body() dto: CreateAppointmentDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<AppointmentResponseDto> {
    return this.createAppointmentUseCase.execute(dto, currentUser)
  }

  @Get('availability')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.USER)
  getAvailability(
    @Query() query: AvailabilityQueryDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<AvailabilityResponseDto> {
    return this.getAvailabilityUseCase.execute(query, currentUser)
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.USER)
  findAll(
    @Query() query: ListAppointmentsQueryDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<PaginatedAppointmentsResponseDto> {
    return this.listAppointmentsUseCase.execute(query, currentUser)
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.USER)
  findById(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<AppointmentResponseDto> {
    return this.findAppointmentByIdUseCase.execute(id, currentUser)
  }

  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelAppointmentDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<AppointmentResponseDto> {
    return this.cancelAppointmentUseCase.execute(id, dto, currentUser)
  }

  @Patch(':id/complete')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  complete(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<AppointmentResponseDto> {
    return this.completeAppointmentUseCase.execute(id, currentUser)
  }
}
