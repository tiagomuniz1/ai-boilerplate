import { Injectable, Logger } from '@nestjs/common'
import { INotificationAdapter } from './notification.adapter.interface'

@Injectable()
export class NotificationAdapter implements INotificationAdapter {
  private readonly logger = new Logger(NotificationAdapter.name)

  async sendAccountActivationEmail(to: string, fullName: string): Promise<void> {
    this.logger.log('Account activation email queued', { to, fullName })
  }
}
