import { forwardRef, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CacheModule } from '../../cache/cache.module'
import { ProfessionalsModule } from '../professionals/professionals.module'
import { AppointmentsModule } from '../appointments/appointments.module'
import { Schedule } from './entities/schedule.entity'
import { SchedulesController } from './controllers/schedules.controller'
import { CreateScheduleUseCase } from './use-cases/create-schedule.use-case'
import { UpdateScheduleUseCase } from './use-cases/update-schedule.use-case'
import { DeleteScheduleUseCase } from './use-cases/delete-schedule.use-case'
import { FindScheduleByIdUseCase } from './use-cases/find-schedule-by-id.use-case'
import { ListSchedulesUseCase } from './use-cases/list-schedules.use-case'
import { GetActiveSchedulesForProfessionalUseCase } from './use-cases/get-active-schedules-for-professional.use-case'
import { ISchedulesRepository } from './repositories/schedules.repository.interface'
import { SchedulesRepository } from './repositories/schedules.repository'
import {
  AppointmentsRepositoryAdapter,
  IAppointmentsRepository,
} from './repositories/appointments.repository.adapter'

@Module({
  imports: [
    TypeOrmModule.forFeature([Schedule]),
    CacheModule,
    forwardRef(() => ProfessionalsModule),
    forwardRef(() => AppointmentsModule),
  ],
  controllers: [SchedulesController],
  providers: [
    CreateScheduleUseCase,
    UpdateScheduleUseCase,
    DeleteScheduleUseCase,
    FindScheduleByIdUseCase,
    ListSchedulesUseCase,
    GetActiveSchedulesForProfessionalUseCase,
    { provide: ISchedulesRepository, useClass: SchedulesRepository },
    { provide: IAppointmentsRepository, useClass: AppointmentsRepositoryAdapter },
  ],
  exports: [DeleteScheduleUseCase, GetActiveSchedulesForProfessionalUseCase, ISchedulesRepository],
})
export class SchedulesModule {}
