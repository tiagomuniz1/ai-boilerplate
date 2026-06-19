import { forwardRef, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CacheModule } from '../../cache/cache.module'
import { DoctorsModule } from '../doctors/doctors.module'
import { PatientsModule } from '../patients/patients.module'
import { SchedulesModule } from '../schedules/schedules.module'
import { ScheduleExceptionsModule } from '../schedule-exceptions/schedule-exceptions.module'
import { Appointment } from './entities/appointment.entity'
import { AppointmentsController } from './controllers/appointments.controller'
import { CreateAppointmentUseCase } from './use-cases/create-appointment.use-case'
import { CancelAppointmentUseCase } from './use-cases/cancel-appointment.use-case'
import { CompleteAppointmentUseCase } from './use-cases/complete-appointment.use-case'
import { FindAppointmentByIdUseCase } from './use-cases/find-appointment-by-id.use-case'
import { ListAppointmentsUseCase } from './use-cases/list-appointments.use-case'
import { GetAvailabilityUseCase } from './use-cases/get-availability.use-case'
import { HasFutureAppointmentsByScheduleUseCase } from './use-cases/has-future-appointments-by-schedule.use-case'
import { FindScheduledAppointmentsInWindowUseCase } from './use-cases/find-scheduled-appointments-in-window.use-case'
import { IAppointmentsRepository } from './repositories/appointments.repository.interface'
import { AppointmentsRepository } from './repositories/appointments.repository'

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment]),
    CacheModule,
    forwardRef(() => DoctorsModule),
    PatientsModule,
    forwardRef(() => SchedulesModule),
    forwardRef(() => ScheduleExceptionsModule),
  ],
  controllers: [AppointmentsController],
  providers: [
    CreateAppointmentUseCase,
    CancelAppointmentUseCase,
    CompleteAppointmentUseCase,
    FindAppointmentByIdUseCase,
    ListAppointmentsUseCase,
    GetAvailabilityUseCase,
    HasFutureAppointmentsByScheduleUseCase,
    FindScheduledAppointmentsInWindowUseCase,
    { provide: IAppointmentsRepository, useClass: AppointmentsRepository },
  ],
  exports: [HasFutureAppointmentsByScheduleUseCase, FindScheduledAppointmentsInWindowUseCase],
})
export class AppointmentsModule {}
