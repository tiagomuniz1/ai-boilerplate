import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CacheModule } from '../../cache/cache.module'
import { DoctorsModule } from '../doctors/doctors.module'
import { Schedule } from './entities/schedule.entity'
import { SchedulesController } from './controllers/schedules.controller'
import { CreateScheduleUseCase } from './use-cases/create-schedule.use-case'
import { UpdateScheduleUseCase } from './use-cases/update-schedule.use-case'
import { DeleteScheduleUseCase } from './use-cases/delete-schedule.use-case'
import { FindScheduleByIdUseCase } from './use-cases/find-schedule-by-id.use-case'
import { ListSchedulesUseCase } from './use-cases/list-schedules.use-case'
import { ISchedulesRepository } from './repositories/schedules.repository.interface'
import { SchedulesRepository } from './repositories/schedules.repository'
import {
  AppointmentsRepositoryStub,
  IAppointmentsRepository,
} from './repositories/appointments.repository.stub'

@Module({
  imports: [TypeOrmModule.forFeature([Schedule]), CacheModule, DoctorsModule],
  controllers: [SchedulesController],
  providers: [
    CreateScheduleUseCase,
    UpdateScheduleUseCase,
    DeleteScheduleUseCase,
    FindScheduleByIdUseCase,
    ListSchedulesUseCase,
    { provide: ISchedulesRepository, useClass: SchedulesRepository },
    { provide: IAppointmentsRepository, useClass: AppointmentsRepositoryStub },
  ],
})
export class SchedulesModule {}
