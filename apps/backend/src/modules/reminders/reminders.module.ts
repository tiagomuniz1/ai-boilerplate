import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CacheModule } from '../../cache/cache.module'
import { AppointmentReminder } from './entities/appointment-reminder.entity'
import { AppointmentRemindersRepository } from './repositories/appointment-reminders.repository'
import { IAppointmentRemindersRepository } from './repositories/appointment-reminders.repository.interface'
import { AwsSmsAdapter } from './adapters/aws-sms.adapter'
import { ISmsAdapter } from './adapters/sms.adapter.interface'
import { SendAppointmentRemindersUseCase } from './use-cases/send-appointment-reminders.use-case'
import { RemindersScheduler } from './reminders.scheduler'

@Module({
  imports: [TypeOrmModule.forFeature([AppointmentReminder]), CacheModule],
  providers: [
    SendAppointmentRemindersUseCase,
    RemindersScheduler,
    { provide: IAppointmentRemindersRepository, useClass: AppointmentRemindersRepository },
    { provide: ISmsAdapter, useClass: AwsSmsAdapter },
  ],
})
export class RemindersModule {}
