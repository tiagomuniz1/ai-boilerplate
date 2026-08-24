jest.mock('twilio', () => ({ Twilio: jest.fn() }))
jest.mock('opossum')
jest.mock('../../../config/env.config')

import { Twilio } from 'twilio'
import * as CircuitBreakerModule from 'opossum'
import { getEnvConfig } from '../../../config/env.config'
import { ISendWhatsAppReminderParams } from './whatsapp-reminder.adapter.interface'
import { TwilioWhatsAppAdapter } from './twilio-whatsapp.adapter'

const mockGetEnvConfig = getEnvConfig as jest.Mock
const mockTwilioCtor = Twilio as unknown as jest.Mock

const fullConfig = {
  TWILIO_ACCOUNT_SID: 'AC123',
  TWILIO_AUTH_TOKEN: 'token-1',
  TWILIO_WHATSAPP_FROM: 'whatsapp:+14155238886',
  TWILIO_REMINDER_CONTENT_SID: 'HX123',
}

const params: ISendWhatsAppReminderParams = {
  toE164: '+5511998877665',
  variables: { '1': 'Maria', '2': 'Dr. Ana' },
}

function makePassThroughBreaker(sendFn: (p: ISendWhatsAppReminderParams) => Promise<unknown>) {
  return { fire: jest.fn().mockImplementation((p: ISendWhatsAppReminderParams) => sendFn(p)) }
}

describe('TwilioWhatsAppAdapter', () => {
  let mockBreaker: ReturnType<typeof makePassThroughBreaker>
  let breakerOptions: Record<string, unknown>
  let mockCreate: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockCreate = jest.fn().mockResolvedValue({ sid: 'SM123' })
    mockTwilioCtor.mockImplementation(() => ({ messages: { create: mockCreate } }))
    mockGetEnvConfig.mockReturnValue({ ...fullConfig })
  })

  function buildAdapter() {
    ;(CircuitBreakerModule as unknown as jest.Mock).mockImplementation((fn: any, opts: any) => {
      breakerOptions = opts
      mockBreaker = makePassThroughBreaker(fn)
      return mockBreaker
    })
    return new TwilioWhatsAppAdapter()
  }

  it('fires the circuit breaker with the params', async () => {
    const adapter = buildAdapter()
    await adapter.sendReminder(params)
    expect(mockBreaker.fire).toHaveBeenCalledWith(params)
  })

  it('sends a WhatsApp template message with contentSid + variables', async () => {
    const adapter = buildAdapter()

    const result = await adapter.sendReminder(params)

    expect(mockCreate).toHaveBeenCalledWith({
      from: 'whatsapp:+14155238886',
      to: 'whatsapp:+5511998877665',
      contentSid: 'HX123',
      contentVariables: JSON.stringify({ '1': 'Maria', '2': 'Dr. Ana' }),
    })
    expect(result).toEqual({ status: 'sent', providerMessageId: 'SM123' })
  })

  it('constructs the Twilio client with the account sid + auth token', async () => {
    const adapter = buildAdapter()
    await adapter.sendReminder(params)
    expect(mockTwilioCtor).toHaveBeenCalledWith('AC123', 'token-1')
  })

  it('reuses the same client across sends', async () => {
    const adapter = buildAdapter()
    await adapter.sendReminder(params)
    await adapter.sendReminder(params)
    expect(mockTwilioCtor).toHaveBeenCalledTimes(1)
  })

  it('returns null providerMessageId when the message has no sid', async () => {
    mockCreate.mockResolvedValue({})
    const adapter = buildAdapter()
    expect(await adapter.sendReminder(params)).toEqual({ status: 'sent', providerMessageId: null })
  })

  it.each([
    ['TWILIO_ACCOUNT_SID'],
    ['TWILIO_AUTH_TOKEN'],
    ['TWILIO_WHATSAPP_FROM'],
    ['TWILIO_REMINDER_CONTENT_SID'],
  ])('skips (does not call Twilio) when %s is missing', async (missingKey) => {
    mockGetEnvConfig.mockReturnValue({ ...fullConfig, [missingKey]: undefined })
    const adapter = buildAdapter()

    const result = await adapter.sendReminder(params)

    expect(result).toEqual({ status: 'skipped', providerMessageId: null })
    expect(mockTwilioCtor).not.toHaveBeenCalled()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('propagates provider errors so the caller can record the failure', async () => {
    mockCreate.mockRejectedValue(new Error('twilio 500'))
    const adapter = buildAdapter()
    await expect(adapter.sendReminder(params)).rejects.toThrow('twilio 500')
  })

  it('configures the circuit breaker with a timeout and reset window', () => {
    buildAdapter()
    expect(breakerOptions).toMatchObject({ timeout: 10000, errorThresholdPercentage: 50, resetTimeout: 30000 })
  })
})
