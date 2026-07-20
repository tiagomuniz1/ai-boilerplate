import { forwardRef, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CacheModule } from '../../cache/cache.module'
import { ProfessionalsModule } from '../professionals/professionals.module'
import { AppointmentsModule } from '../appointments/appointments.module'
import { ScheduleException } from './entities/schedule-exception.entity'
import { ScheduleExceptionsController } from './controllers/schedule-exceptions.controller'
import { CreateScheduleExceptionUseCase } from './use-cases/create-schedule-exception.use-case'
import { UpdateScheduleExceptionUseCase } from './use-cases/update-schedule-exception.use-case'
import { DeleteScheduleExceptionUseCase } from './use-cases/delete-schedule-exception.use-case'
import { FindScheduleExceptionByIdUseCase } from './use-cases/find-schedule-exception-by-id.use-case'
import { ListScheduleExceptionsUseCase } from './use-cases/list-schedule-exceptions.use-case'
import { GetActiveExceptionsForProfessionalUseCase } from './use-cases/get-active-exceptions-for-professional.use-case'
import { IScheduleExceptionsRepository } from './repositories/schedule-exceptions.repository.interface'
import { ScheduleExceptionsRepository } from './repositories/schedule-exceptions.repository'
import {
  AppointmentsRepositoryAdapter,
  IAppointmentsRepository,
} from './repositories/appointments.repository.adapter'

@Module({
  imports: [
    TypeOrmModule.forFeature([ScheduleException]),
    CacheModule,
    forwardRef(() => ProfessionalsModule),
    forwardRef(() => AppointmentsModule),
  ],
  controllers: [ScheduleExceptionsController],
  providers: [
    CreateScheduleExceptionUseCase,
    UpdateScheduleExceptionUseCase,
    DeleteScheduleExceptionUseCase,
    FindScheduleExceptionByIdUseCase,
    ListScheduleExceptionsUseCase,
    GetActiveExceptionsForProfessionalUseCase,
    { provide: IScheduleExceptionsRepository, useClass: ScheduleExceptionsRepository },
    { provide: IAppointmentsRepository, useClass: AppointmentsRepositoryAdapter },
  ],
  exports: [GetActiveExceptionsForProfessionalUseCase],
})
export class ScheduleExceptionsModule {}
