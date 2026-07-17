jest.mock('nodemailer')
jest.mock('opossum')
jest.mock('../../../config/env.config')

import * as nodemailer from 'nodemailer'
import * as CircuitBreakerModule from 'opossum'
import { getEnvConfig } from '../../../config/env.config'
import { AccessRequestEmailAdapter } from '../adapters/access-request-email.adapter'

const mockGetEnvConfig = getEnvConfig as jest.Mock

function makePassThroughBreaker(sendFn: (params: any) => Promise<void>) {
  return {
    fire: jest.fn().mockImplementation((params: any) => sendFn(params)),
    fallback: jest.fn(),
  }
}

describe('AccessRequestEmailAdapter', () => {
  let mockBreaker: ReturnType<typeof makePassThroughBreaker>
  let mockSendMail: jest.Mock

  const baseEnv = {
    SMTP_HOST: 'smtp.example.com',
    SMTP_PORT: 587,
    SMTP_USER: 'user',
    SMTP_PASS: 'pass',
    SMTP_FROM: 'noreply@pulso.center',
    ACCESS_REQUEST_TO_EMAIL: 'tiagomuniz1@gmail.com',
  }

  const baseParams = {
    fullName: 'Ana Costa',
    email: 'ana@clinica.com',
    clinicName: 'Clínica do Vale',
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
    return new AccessRequestEmailAdapter()
  }

  describe('sendAccessRequestEmail', () => {
    it('fires the circuit breaker with the provided params', async () => {
      mockGetEnvConfig.mockReturnValue(baseEnv)
      const adapter = buildAdapter()

      await adapter.sendAccessRequestEmail(baseParams)

      expect(mockBreaker.fire).toHaveBeenCalledWith(baseParams)
    })

    it('sends email to the configured recipient with replyTo set to the requester', async () => {
      mockGetEnvConfig.mockReturnValue(baseEnv)
      const adapter = buildAdapter()

      await adapter.sendAccessRequestEmail(baseParams)

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: { user: 'user', pass: 'pass' },
      })
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'Pulso <noreply@pulso.center>',
          to: 'tiagomuniz1@gmail.com',
          replyTo: 'ana@clinica.com',
          subject: 'Solicitação de acesso — Clínica do Vale',
        }),
      )
    })

    it('includes fullName, email and clinicName in the body', async () => {
      mockGetEnvConfig.mockReturnValue(baseEnv)
      const adapter = buildAdapter()

      await adapter.sendAccessRequestEmail(baseParams)

      const [{ html }] = mockSendMail.mock.calls[0]
      expect(html).toContain('Ana Costa')
      expect(html).toContain('ana@clinica.com')
      expect(html).toContain('Clínica do Vale')
    })

    it('includes phone in the body when provided', async () => {
      mockGetEnvConfig.mockReturnValue(baseEnv)
      const adapter = buildAdapter()

      await adapter.sendAccessRequestEmail({ ...baseParams, phone: '11999998888' })

      const [{ html }] = mockSendMail.mock.calls[0]
      expect(html).toContain('11999998888')
    })

    it('omits the phone line when phone is not provided', async () => {
      mockGetEnvConfig.mockReturnValue(baseEnv)
      const adapter = buildAdapter()

      await adapter.sendAccessRequestEmail(baseParams)

      const [{ html }] = mockSendMail.mock.calls[0]
      expect(html).not.toContain('Telefone')
    })

    it('escapes HTML in requester-provided fields', async () => {
      mockGetEnvConfig.mockReturnValue(baseEnv)
      const adapter = buildAdapter()

      await adapter.sendAccessRequestEmail({
        ...baseParams,
        fullName: '<script>alert(1)</script>',
      })

      const [{ html }] = mockSendMail.mock.calls[0]
      expect(html).not.toContain('<script>')
      expect(html).toContain('&lt;script&gt;')
    })

    it('skips send and does not throw when SMTP_HOST is not configured', async () => {
      mockGetEnvConfig.mockReturnValue({ ...baseEnv, SMTP_HOST: undefined })
      const adapter = buildAdapter()

      await expect(adapter.sendAccessRequestEmail(baseParams)).resolves.toBeUndefined()

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
