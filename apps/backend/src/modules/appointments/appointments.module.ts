import { forwardRef, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CacheModule } from '../../cache/cache.module'
import { ProfessionalsModule } from '../professionals/professionals.module'
import { PatientsModule } from '../patients/patients.module'
import { SchedulesModule } from '../schedules/schedules.module'
import { ScheduleExceptionsModule } from '../schedule-exceptions/schedule-exceptions.module'
import { Appointment } from './entities/appointment.entity'
import { AppointmentSeries } from './entities/appointment-series.entity'
import { AppointmentsController } from './controllers/appointments.controller'
import { CreateAppointmentUseCase } from './use-cases/create-appointment.use-case'
import { CancelAppointmentUseCase } from './use-cases/cancel-appointment.use-case'
import { CompleteAppointmentUseCase } from './use-cases/complete-appointment.use-case'
import { ConfirmAppointmentUseCase } from './use-cases/confirm-appointment.use-case'
import { MarkAppointmentNoShowUseCase } from './use-cases/mark-appointment-no-show.use-case'
import { FindAppointmentByIdUseCase } from './use-cases/find-appointment-by-id.use-case'
import { ListAppointmentsUseCase } from './use-cases/list-appointments.use-case'
import { GetAvailabilityUseCase } from './use-cases/get-availability.use-case'
import { ResolveProfessionalSlotUseCase } from './use-cases/resolve-professional-slot.use-case'
import { PreviewRecurringAppointmentsUseCase } from './use-cases/preview-recurring-appointments.use-case'
import { CreateRecurringAppointmentsUseCase } from './use-cases/create-recurring-appointments.use-case'
import { FindAppointmentSeriesByIdUseCase } from './use-cases/find-appointment-series-by-id.use-case'
import { ReassignAppointmentUseCase } from './use-cases/reassign-appointment.use-case'
import { GetReassignCandidatesUseCase } from './use-cases/get-reassign-candidates.use-case'
import { HasFutureAppointmentsByScheduleUseCase } from './use-cases/has-future-appointments-by-schedule.use-case'
import { FindScheduledAppointmentsInWindowUseCase } from './use-cases/find-scheduled-appointments-in-window.use-case'
import { IAppointmentsRepository } from './repositories/appointments.repository.interface'
import { AppointmentsRepository } from './repositories/appointments.repository'
import { IAppointmentSeriesRepository } from './repositories/appointment-series.repository.interface'
import { AppointmentSeriesRepository } from './repositories/appointment-series.repository'

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment, AppointmentSeries]),
    CacheModule,
    forwardRef(() => ProfessionalsModule),
    PatientsModule,
    forwardRef(() => SchedulesModule),
    forwardRef(() => ScheduleExceptionsModule),
  ],
  controllers: [AppointmentsController],
  providers: [
    CreateAppointmentUseCase,
    CancelAppointmentUseCase,
    CompleteAppointmentUseCase,
    ConfirmAppointmentUseCase,
    MarkAppointmentNoShowUseCase,
    FindAppointmentByIdUseCase,
    ListAppointmentsUseCase,
    GetAvailabilityUseCase,
    ResolveProfessionalSlotUseCase,
    PreviewRecurringAppointmentsUseCase,
    CreateRecurringAppointmentsUseCase,
    FindAppointmentSeriesByIdUseCase,
    ReassignAppointmentUseCase,
    GetReassignCandidatesUseCase,
    HasFutureAppointmentsByScheduleUseCase,
    FindScheduledAppointmentsInWindowUseCase,
    { provide: IAppointmentsRepository, useClass: AppointmentsRepository },
    { provide: IAppointmentSeriesRepository, useClass: AppointmentSeriesRepository },
  ],
  exports: [HasFutureAppointmentsByScheduleUseCase, FindScheduledAppointmentsInWindowUseCase, IAppointmentsRepository],
})
export class AppointmentsModule {}
