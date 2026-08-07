import { Injectable, Logger } from '@nestjs/common'
import { PinpointSMSVoiceV2Client, SendTextMessageCommand } from '@aws-sdk/client-pinpoint-sms-voice-v2'
import * as CircuitBreaker from 'opossum'
import { getEnvConfig } from '../../../config/env.config'
import { ISendSmsParams, ISendSmsResult, ISmsAdapter } from './sms.adapter.interface'

/**
 * Sends SMS via AWS End User Messaging (Pinpoint SMS Voice v2). Credentials come
 * from the EC2 instance role (default provider chain) — no static keys, same as
 * the S3 storage adapter. Resilience: the SDK client retries transient errors
 * (maxAttempts) and an opossum circuit breaker adds a timeout + fail-fast when
 * the provider is unhealthy. Errors propagate so the caller records the failure
 * per message.
 */
@Injectable()
export class AwsSmsAdapter implements ISmsAdapter {
  private readonly logger = new Logger(AwsSmsAdapter.name)
  private readonly breaker: CircuitBreaker<[ISendSmsParams], ISendSmsResult>
  private client: PinpointSMSVoiceV2Client | null = null

  constructor() {
    this.breaker = new CircuitBreaker((params: ISendSmsParams) => this.send(params), {
      timeout: 10000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
    })
  }

  async sendSms(params: ISendSmsParams): Promise<ISendSmsResult> {
    return this.breaker.fire(params)
  }

  private async send(params: ISendSmsParams): Promise<ISendSmsResult> {
    const env = getEnvConfig()

    if (!env.AWS_SMS_ORIGINATION_IDENTITY) {
      this.logger.warn('AWS_SMS_ORIGINATION_IDENTITY not configured — skipping SMS send', {
        context: AwsSmsAdapter.name,
      })
      return { status: 'skipped', providerMessageId: null }
    }

    if (!this.client) {
      this.client = new PinpointSMSVoiceV2Client({
        region: env.AWS_REGION ?? 'us-east-1',
        maxAttempts: 3,
      })
    }

    const result = await this.client.send(
      new SendTextMessageCommand({
        DestinationPhoneNumber: params.toE164,
        OriginationIdentity: env.AWS_SMS_ORIGINATION_IDENTITY,
        MessageBody: params.body,
        MessageType: 'TRANSACTIONAL',
        ConfigurationSetName: env.AWS_SMS_CONFIG_SET,
      }),
    )

    return { status: 'sent', providerMessageId: result.MessageId ?? null }
  }
}
