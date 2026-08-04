jest.mock('axios')
jest.mock('axios-retry')
jest.mock('opossum')
jest.mock('../../../config/env.config')

import axios from 'axios'
import axiosRetry from 'axios-retry'
import * as CircuitBreakerModule from 'opossum'
import { getEnvConfig } from '../../../config/env.config'
import { TurnstileCaptchaAdapter } from './turnstile-captcha.adapter'

const mockGetEnvConfig = getEnvConfig as jest.Mock
const mockAxiosCreate = axios.create as jest.Mock

// The circuit breaker is instantiated in the constructor. Make it a pass-through
// so fire() simply calls the underlying request() function directly.
function makePassThroughBreaker(requestFn: (token: string, remoteIp?: string) => Promise<boolean>) {
  return {
    fire: jest.fn().mockImplementation((token: string, remoteIp?: string) => requestFn(token, remoteIp)),
    fallback: jest.fn(),
  }
}

describe('TurnstileCaptchaAdapter', () => {
  let mockBreaker: ReturnType<typeof makePassThroughBreaker>
  let mockPost: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockPost = jest.fn()
    mockAxiosCreate.mockReturnValue({ post: mockPost })
    mockGetEnvConfig.mockReturnValue({ TURNSTILE_SECRET_KEY: 'real-secret' })
  })

  function buildAdapter() {
    let capturedRequestFn: (token: string, remoteIp?: string) => Promise<boolean>
    ;(CircuitBreakerModule as any).mockImplementation((fn: any, _opts: any) => {
      capturedRequestFn = fn
      mockBreaker = makePassThroughBreaker(capturedRequestFn)
      return mockBreaker
    })
    return new TurnstileCaptchaAdapter()
  }

  describe('verify', () => {
    it('fires the circuit breaker with token and remoteIp', async () => {
      mockPost.mockResolvedValue({ data: { success: true } })
      const adapter = buildAdapter()

      await adapter.verify('a-token', '1.2.3.4')

      expect(mockBreaker.fire).toHaveBeenCalledWith('a-token', '1.2.3.4')
    })

    it('returns true when Turnstile reports success', async () => {
      mockPost.mockResolvedValue({ data: { success: true } })
      const adapter = buildAdapter()

      expect(await adapter.verify('a-token')).toBe(true)
    })

    it('returns false when Turnstile reports failure', async () => {
      mockPost.mockResolvedValue({ data: { success: false } })
      const adapter = buildAdapter()

      expect(await adapter.verify('a-token')).toBe(false)
    })

    it('posts to the siteverify endpoint with the configured secret', async () => {
      mockPost.mockResolvedValue({ data: { success: true } })
      const adapter = buildAdapter()

      await adapter.verify('a-token', '1.2.3.4')

      expect(mockPost).toHaveBeenCalledWith(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        { secret: 'real-secret', response: 'a-token', remoteip: '1.2.3.4' },
      )
    })

    it('omits remoteip when not provided', async () => {
      mockPost.mockResolvedValue({ data: { success: true } })
      const adapter = buildAdapter()

      await adapter.verify('a-token')

      expect(mockPost).toHaveBeenCalledWith(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        { secret: 'real-secret', response: 'a-token' },
      )
    })

    it('falls back to the Cloudflare test secret when TURNSTILE_SECRET_KEY is not configured', async () => {
      mockGetEnvConfig.mockReturnValue({ TURNSTILE_SECRET_KEY: undefined })
      mockPost.mockResolvedValue({ data: { success: true } })
      const adapter = buildAdapter()

      await adapter.verify('a-token')

      expect(mockPost).toHaveBeenCalledWith(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        expect.objectContaining({ secret: '1x0000000000000000000000000000000AA' }),
      )
    })
  })

  describe('resilience wiring', () => {
    it('configures axios-retry on the internal axios instance', () => {
      buildAdapter()

      expect(axiosRetry).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ retries: 3 }),
      )
    })

    it('retryCondition retries on network errors', () => {
      buildAdapter()
      const { retryCondition } = (axiosRetry as unknown as jest.Mock).mock.calls[0][1]
      ;(axiosRetry as any).isNetworkError = jest.fn().mockReturnValue(true)
      ;(axiosRetry as any).isRetryableError = jest.fn().mockReturnValue(false)

      expect(retryCondition(new Error('network'))).toBe(true)
    })

    it('retryCondition retries on retryable (5xx) errors', () => {
      buildAdapter()
      const { retryCondition } = (axiosRetry as unknown as jest.Mock).mock.calls[0][1]
      ;(axiosRetry as any).isNetworkError = jest.fn().mockReturnValue(false)
      ;(axiosRetry as any).isRetryableError = jest.fn().mockReturnValue(true)

      expect(retryCondition(new Error('5xx'))).toBe(true)
    })

    it('retryCondition does not retry other errors', () => {
      buildAdapter()
      const { retryCondition } = (axiosRetry as unknown as jest.Mock).mock.calls[0][1]
      ;(axiosRetry as any).isNetworkError = jest.fn().mockReturnValue(false)
      ;(axiosRetry as any).isRetryableError = jest.fn().mockReturnValue(false)

      expect(retryCondition(new Error('4xx'))).toBe(false)
    })

    it('registers a fail-closed fallback on the circuit breaker', () => {
      buildAdapter()

      expect(mockBreaker.fallback).toHaveBeenCalledWith(expect.any(Function))
    })

    it('fallback returns false (fail-closed) when the circuit is open', () => {
      buildAdapter()

      const fallbackFn: () => boolean = mockBreaker.fallback.mock.calls[0][0]
      expect(fallbackFn()).toBe(false)
    })
  })
})
