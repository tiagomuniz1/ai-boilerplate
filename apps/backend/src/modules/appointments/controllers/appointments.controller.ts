import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import {
  AppointmentResponseDto,
  AppointmentSeriesResponseDto,
  AvailabilityResponseDto,
  CancelAppointmentDto,
  CancelAppointmentResponseDto,
  CreateAppointmentDto,
  CreateRecurringAppointmentsDto,
  CreateRecurringAppointmentsResponseDto,
  PaginatedAppointmentsResponseDto,
  PreviewRecurringAppointmentsDto,
  PreviewRecurringAppointmentsResponseDto,
  ReassignAppointmentDto,
  ReassignCandidateDto,
  UserRole,
} from '@app/shared'
import { IdempotencyInterceptor } from '../../../common/interceptors/idempotency.interceptor'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { Roles } from '../../auth/decorators/roles.decorator'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { AvailabilityQueryDto } from '../dto/availability-query.dto'
import { ListAppointmentsQueryDto } from '../dto/list-appointments-query.dto'
import { CancelAppointmentUseCase } from '../use-cases/cancel-appointment.use-case'
import { CompleteAppointmentUseCase } from '../use-cases/complete-appointment.use-case'
import { ConfirmAppointmentUseCase } from '../use-cases/confirm-appointment.use-case'
import { CreateAppointmentUseCase } from '../use-cases/create-appointment.use-case'
import { FindAppointmentByIdUseCase } from '../use-cases/find-appointment-by-id.use-case'
import { GetAvailabilityUseCase } from '../use-cases/get-availability.use-case'
import { GetReassignCandidatesUseCase } from '../use-cases/get-reassign-candidates.use-case'
import { PreviewRecurringAppointmentsUseCase } from '../use-cases/preview-recurring-appointments.use-case'
import { CreateRecurringAppointmentsUseCase } from '../use-cases/create-recurring-appointments.use-case'
import { FindAppointmentSeriesByIdUseCase } from '../use-cases/find-appointment-series-by-id.use-case'
import { ReassignAppointmentUseCase } from '../use-cases/reassign-appointment.use-case'
import { ListAppointmentsUseCase } from '../use-cases/list-appointments.use-case'
import { MarkAppointmentNoShowUseCase } from '../use-cases/mark-appointment-no-show.use-case'

@Controller('appointments')
export class AppointmentsController {
  constructor(
    private readonly createAppointmentUseCase: CreateAppointmentUseCase,
    private readonly cancelAppointmentUseCase: CancelAppointmentUseCase,
    private readonly completeAppointmentUseCase: CompleteAppointmentUseCase,
    private readonly confirmAppointmentUseCase: ConfirmAppointmentUseCase,
    private readonly markAppointmentNoShowUseCase: MarkAppointmentNoShowUseCase,
    private readonly findAppointmentByIdUseCase: FindAppointmentByIdUseCase,
    private readonly listAppointmentsUseCase: ListAppointmentsUseCase,
    private readonly getAvailabilityUseCase: GetAvailabilityUseCase,
    private readonly getReassignCandidatesUseCase: GetReassignCandidatesUseCase,
    private readonly previewRecurringAppointmentsUseCase: PreviewRecurringAppointmentsUseCase,
    private readonly createRecurringAppointmentsUseCase: CreateRecurringAppointmentsUseCase,
    private readonly findAppointmentSeriesByIdUseCase: FindAppointmentSeriesByIdUseCase,
    private readonly reassignAppointmentUseCase: ReassignAppointmentUseCase,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  @HttpCode(201)
  create(
    @Body() dto: CreateAppointmentDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<AppointmentResponseDto> {
    return this.createAppointmentUseCase.execute(dto, currentUser)
  }

  @Get('availability')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL, UserRole.USER)
  getAvailability(
    @Query() query: AvailabilityQueryDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<AvailabilityResponseDto> {
    return this.getAvailabilityUseCase.execute(query, currentUser)
  }

  // Creates up to 26 appointments in one shot, so a retried request must not
  // duplicate the series — the one endpoint that genuinely needs Idempotency-Key.
  @Post('recurring')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseInterceptors(IdempotencyInterceptor)
  @HttpCode(201)
  createRecurring(
    @Body() dto: CreateRecurringAppointmentsDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<CreateRecurringAppointmentsResponseDto> {
    return this.createRecurringAppointmentsUseCase.execute(dto, currentUser)
  }

  @Get('recurring/preview')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  previewRecurring(
    @Query() query: PreviewRecurringAppointmentsDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<PreviewRecurringAppointmentsResponseDto> {
    return this.previewRecurringAppointmentsUseCase.execute(query, currentUser)
  }

  @Get('series/:seriesId')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL, UserRole.USER)
  findSeriesById(
    @Param('seriesId') seriesId: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<AppointmentSeriesResponseDto> {
    return this.findAppointmentSeriesByIdUseCase.execute(seriesId, currentUser)
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL, UserRole.USER)
  findAll(
    @Query() query: ListAppointmentsQueryDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<PaginatedAppointmentsResponseDto> {
    return this.listAppointmentsUseCase.execute(query, currentUser)
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL, UserRole.USER)
  findById(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<AppointmentResponseDto> {
    return this.findAppointmentByIdUseCase.execute(id, currentUser)
  }

  @Get(':id/reassign-candidates')
  @Roles(UserRole.ADMIN)
  reassignCandidates(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<ReassignCandidateDto[]> {
    return this.getReassignCandidatesUseCase.execute(id, currentUser)
  }

  @Patch(':id/confirm')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  confirm(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<AppointmentResponseDto> {
    return this.confirmAppointmentUseCase.execute(id, currentUser)
  }

  @Patch(':id/no-show')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  noShow(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<AppointmentResponseDto> {
    return this.markAppointmentNoShowUseCase.execute(id, currentUser)
  }

  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelAppointmentDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<CancelAppointmentResponseDto> {
    return this.cancelAppointmentUseCase.execute(id, dto, currentUser)
  }

  @Patch(':id/complete')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  complete(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<AppointmentResponseDto> {
    return this.completeAppointmentUseCase.execute(id, currentUser)
  }

  @Patch(':id/reassign')
  @Roles(UserRole.ADMIN)
  reassign(
    @Param('id') id: string,
    @Body() dto: ReassignAppointmentDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<AppointmentResponseDto> {
    return this.reassignAppointmentUseCase.execute(id, dto, currentUser)
  }
}
