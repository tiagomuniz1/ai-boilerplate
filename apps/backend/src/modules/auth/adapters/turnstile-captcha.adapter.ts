import { Injectable, Logger } from '@nestjs/common'
import axios from 'axios'
import axiosRetry from 'axios-retry'
import * as CircuitBreaker from 'opossum'
import { getEnvConfig } from '../../../config/env.config'
import { ICaptchaAdapter } from './captcha.adapter.interface'

// Cloudflare's official "always passes" test secret — used when TURNSTILE_SECRET_KEY
// isn't configured (local/dev), so login still works without a real Turnstile account.
// https://developers.cloudflare.com/turnstile/troubleshooting/testing/
const TEST_SECRET_KEY_ALWAYS_PASSES = '1x0000000000000000000000000000000AA'

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

interface SiteverifyResponse {
  success: boolean
}

@Injectable()
export class TurnstileCaptchaAdapter implements ICaptchaAdapter {
  private readonly logger = new Logger(TurnstileCaptchaAdapter.name)
  private readonly client = axios.create({ timeout: 4000 })
  private readonly breaker: CircuitBreaker<[string, string | undefined], boolean>

  constructor() {
    axiosRetry(this.client, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => axiosRetry.isNetworkError(error) || axiosRetry.isRetryableError(error),
    })

    this.breaker = new CircuitBreaker(
      (token: string, remoteIp: string | undefined) => this.request(token, remoteIp),
      {
        timeout: 4000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
      },
    )

    // Fail-closed: if Turnstile is unreachable, deny the captcha rather than
    // silently letting the login through — this gate only activates after 2
    // failed attempts already happened, so the blast radius is limited to
    // accounts already showing suspicious activity.
    this.breaker.fallback(() => {
      this.logger.warn('Captcha circuit breaker open — denying verification (fail-closed)')
      return false
    })
  }

  async verify(token: string, remoteIp?: string): Promise<boolean> {
    return this.breaker.fire(token, remoteIp)
  }

  private async request(token: string, remoteIp: string | undefined): Promise<boolean> {
    const env = getEnvConfig()
    const secret = env.TURNSTILE_SECRET_KEY ?? TEST_SECRET_KEY_ALWAYS_PASSES

    const response = await this.client.post<SiteverifyResponse>(SITEVERIFY_URL, {
      secret,
      response: token,
      ...(remoteIp ? { remoteip: remoteIp } : {}),
    })

    return response.data.success === true
  }
}
