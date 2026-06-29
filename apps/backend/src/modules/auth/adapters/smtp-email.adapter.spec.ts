jest.mock('nodemailer')
jest.mock('opossum')
jest.mock('../../../config/env.config')

import * as nodemailer from 'nodemailer'
import * as CircuitBreakerModule from 'opossum'
import { getEnvConfig } from '../../../config/env.config'
import { SmtpEmailAdapter } from './smtp-email.adapter'

const mockGetEnvConfig = getEnvConfig as jest.Mock

// The circuit breaker is instantiated in the constructor. We make it a pass-through
// so that fire() simply calls the underlying send() function directly.
function makePassThroughBreaker(sendFn: (params: any) => Promise<void>) {
  return {
    fire: jest.fn().mockImplementation((params: any) => sendFn(params)),
    fallback: jest.fn(),
  }
}

describe('SmtpEmailAdapter', () => {
  let mockBreaker: ReturnType<typeof makePassThroughBreaker>
  let mockSendMail: jest.Mock

  const baseEnv = {
    SMTP_HOST: 'smtp.example.com',
    SMTP_PORT: 587,
    SMTP_USER: 'user',
    SMTP_PASS: 'pass',
    SMTP_FROM: 'noreply@pulso.center',
  }

  const baseParams = {
    to: 'doctor@example.com',
    recipientName: 'Dr. Ana',
    link: 'https://app.pulso.center/set-password?token=abc',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockSendMail = jest.fn().mockResolvedValue({})
    ;(nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail: mockSendMail })
  })

  function buildAdapter() {
    let capturedSendFn: (params: any) => Promise<void>
    ;(CircuitBreakerModule as any).mockImplementation((fn: any, _opts: any) => {
      capturedSendFn = fn
      mockBreaker = makePassThroughBreaker(capturedSendFn)
      return mockBreaker
    })
    return new SmtpEmailAdapter()
  }

  describe('sendSetPasswordEmail', () => {
    it('fires the circuit breaker with the provided params', async () => {
      mockGetEnvConfig.mockReturnValue(baseEnv)
      const adapter = buildAdapter()

      await adapter.sendSetPasswordEmail(baseParams)

      expect(mockBreaker.fire).toHaveBeenCalledWith(baseParams)
    })

    it('sends email via nodemailer when SMTP_HOST is configured', async () => {
      mockGetEnvConfig.mockReturnValue(baseEnv)
      const adapter = buildAdapter()

      await adapter.sendSetPasswordEmail(baseParams)

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: { user: 'user', pass: 'pass' },
      })
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'doctor@example.com',
          html: expect.stringContaining('Dr. Ana'),
        }),
      )
    })

    it('uses platform defaults when no branding is provided', async () => {
      mockGetEnvConfig.mockReturnValue(baseEnv)
      const adapter = buildAdapter()

      await adapter.sendSetPasswordEmail(baseParams)

      const [{ from, subject, html }] = mockSendMail.mock.calls[0]
      expect(from).toBe('Pulso <noreply@pulso.center>')
      expect(subject).toBe('Defina sua senha — Pulso')
      expect(html).toContain('Pulso')
      expect(html).toContain('#0066cc')
      expect(html).toContain('#e8f0fe')
    })

    it('uses clinic name in from, subject and body when clinicName is provided', async () => {
      mockGetEnvConfig.mockReturnValue(baseEnv)
      const adapter = buildAdapter()

      await adapter.sendSetPasswordEmail({ ...baseParams, clinicName: 'Clínica do Vale' })

      const [{ from, subject, html }] = mockSendMail.mock.calls[0]
      expect(from).toBe('Clínica do Vale <noreply@pulso.center>')
      expect(subject).toBe('Defina sua senha — Clínica do Vale')
      expect(html).toContain('Clínica do Vale')
    })

    it('renders logo img tag when clinicLogoUrl is provided', async () => {
      mockGetEnvConfig.mockReturnValue(baseEnv)
      const adapter = buildAdapter()

      await adapter.sendSetPasswordEmail({
        ...baseParams,
        clinicName: 'Clínica do Vale',
        clinicLogoUrl: 'https://s3.example.com/logo.png',
      })

      const [{ html }] = mockSendMail.mock.calls[0]
      expect(html).toContain('<img')
      expect(html).toContain('src="https://s3.example.com/logo.png"')
      expect(html).toContain('alt="Clínica do Vale"')
    })

    it('renders clinic name as text header when clinicLogoUrl is not provided', async () => {
      mockGetEnvConfig.mockReturnValue(baseEnv)
      const adapter = buildAdapter()

      await adapter.sendSetPasswordEmail({ ...baseParams, clinicName: 'Clínica do Vale' })

      const [{ html }] = mockSendMail.mock.calls[0]
      expect(html).not.toContain('<img')
      expect(html).toContain('Clínica do Vale')
    })

    it('applies accentColor to the CTA button', async () => {
      mockGetEnvConfig.mockReturnValue(baseEnv)
      const adapter = buildAdapter()

      await adapter.sendSetPasswordEmail({ ...baseParams, accentColor: '#e65c00' })

      const [{ html }] = mockSendMail.mock.calls[0]
      expect(html).toContain('background:#e65c00')
    })

    it('falls back to #0066cc when accentColor is not provided', async () => {
      mockGetEnvConfig.mockReturnValue(baseEnv)
      const adapter = buildAdapter()

      await adapter.sendSetPasswordEmail(baseParams)

      const [{ html }] = mockSendMail.mock.calls[0]
      expect(html).toContain('background:#0066cc')
    })

    it('applies accentSoftColor as page background', async () => {
      mockGetEnvConfig.mockReturnValue(baseEnv)
      const adapter = buildAdapter()

      await adapter.sendSetPasswordEmail({ ...baseParams, accentSoftColor: '#fce4ec' })

      const [{ html }] = mockSendMail.mock.calls[0]
      expect(html).toContain('background:#fce4ec')
    })

    it('falls back to #e8f0fe as page background when accentSoftColor is not provided', async () => {
      mockGetEnvConfig.mockReturnValue(baseEnv)
      const adapter = buildAdapter()

      await adapter.sendSetPasswordEmail(baseParams)

      const [{ html }] = mockSendMail.mock.calls[0]
      expect(html).toContain('background:#e8f0fe')
    })

    it('includes the set-password link in the email body', async () => {
      mockGetEnvConfig.mockReturnValue(baseEnv)
      const adapter = buildAdapter()

      await adapter.sendSetPasswordEmail(baseParams)

      const [{ html }] = mockSendMail.mock.calls[0]
      expect(html).toContain(baseParams.link)
    })

    it('skips send and does not throw when SMTP_HOST is not configured', async () => {
      mockGetEnvConfig.mockReturnValue({ ...baseEnv, SMTP_HOST: undefined })
      const adapter = buildAdapter()

      await expect(adapter.sendSetPasswordEmail(baseParams)).resolves.toBeUndefined()

      expect(nodemailer.createTransport).not.toHaveBeenCalled()
    })

    it('registers a fallback on the circuit breaker during construction', () => {
      mockGetEnvConfig.mockReturnValue(baseEnv)
      buildAdapter()

      expect(mockBreaker.fallback).toHaveBeenCalledWith(expect.any(Function))
    })

    it('fallback function does not throw when invoked (circuit open)', () => {
      mockGetEnvConfig.mockReturnValue(baseEnv)
      buildAdapter()

      const fallbackFn: () => void = mockBreaker.fallback.mock.calls[0][0]
      expect(() => fallbackFn()).not.toThrow()
    })
  })
})
