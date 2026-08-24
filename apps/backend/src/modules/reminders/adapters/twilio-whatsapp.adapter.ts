import { Injectable, Logger } from '@nestjs/common'
import { Twilio } from 'twilio'
import * as CircuitBreaker from 'opossum'
import { getEnvConfig } from '../../../config/env.config'
import {
  ISendWhatsAppReminderParams,
  ISendWhatsAppReminderResult,
  IWhatsAppReminderAdapter,
} from './whatsapp-reminder.adapter.interface'

/**
 * Sends appointment reminders as WhatsApp template messages via Twilio.
 * Business-initiated WhatsApp messages must use a pre-approved Content template,
 * so we send a contentSid + contentVariables (not free text). Resilience: an
 * opossum circuit breaker adds a timeout + fail-fast; errors propagate so the
 * caller records the failure per message. Skips gracefully (no throw) until the
 * Twilio/WhatsApp onboarding + template are configured.
 */
@Injectable()
export class TwilioWhatsAppAdapter implements IWhatsAppReminderAdapter {
  private readonly logger = new Logger(TwilioWhatsAppAdapter.name)
  private readonly breaker: CircuitBreaker<[ISendWhatsAppReminderParams], ISendWhatsAppReminderResult>
  private client: Twilio | null = null

  constructor() {
    this.breaker = new CircuitBreaker((params: ISendWhatsAppReminderParams) => this.send(params), {
      timeout: 10000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
    })
  }

  async sendReminder(params: ISendWhatsAppReminderParams): Promise<ISendWhatsAppReminderResult> {
    return this.breaker.fire(params)
  }

  private async send(params: ISendWhatsAppReminderParams): Promise<ISendWhatsAppReminderResult> {
    const env = getEnvConfig()

    if (
      !env.TWILIO_ACCOUNT_SID ||
      !env.TWILIO_AUTH_TOKEN ||
      !env.TWILIO_WHATSAPP_FROM ||
      !env.TWILIO_REMINDER_CONTENT_SID
    ) {
      this.logger.warn('Twilio WhatsApp not fully configured — skipping reminder send', {
        context: TwilioWhatsAppAdapter.name,
      })
      return { status: 'skipped', providerMessageId: null }
    }

    if (!this.client) {
      this.client = new Twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
    }

    const message = await this.client.messages.create({
      from: env.TWILIO_WHATSAPP_FROM,
      to: `whatsapp:${params.toE164}`,
      contentSid: env.TWILIO_REMINDER_CONTENT_SID,
      contentVariables: JSON.stringify(params.variables),
    })

    return { status: 'sent', providerMessageId: message.sid ?? null }
  }
}
