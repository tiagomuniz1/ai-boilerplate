import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { getEnvConfig } from '../../config/env.config'
import { SendAppointmentRemindersUseCase } from './use-cases/send-appointment-reminders.use-case'

/**
 * Fires the appointment-reminder tick every 10 minutes. Runs inside the backend
 * container; the use-case takes a distributed lock so only one instance actually
 * processes a tick. Gated by REMINDERS_ENABLED so dev/test never send.
 */
@Injectable()
export class RemindersScheduler {
  private readonly logger = new Logger(RemindersScheduler.name)

  constructor(private readonly sendAppointmentRemindersUseCase: SendAppointmentRemindersUseCase) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleTick(): Promise<void> {
    if (!getEnvConfig().REMINDERS_ENABLED) return
    await this.sendAppointmentRemindersUseCase.execute()
  }
}
