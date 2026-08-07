jest.mock('@aws-sdk/client-pinpoint-sms-voice-v2', () => ({
  PinpointSMSVoiceV2Client: jest.fn(),
  SendTextMessageCommand: jest.fn().mockImplementation((input) => ({ __type: 'SendTextMessageCommand', input })),
}))
jest.mock('opossum')
jest.mock('../../../config/env.config')

import { PinpointSMSVoiceV2Client, SendTextMessageCommand } from '@aws-sdk/client-pinpoint-sms-voice-v2'
import * as CircuitBreakerModule from 'opossum'
import { getEnvConfig } from '../../../config/env.config'
import { ISendSmsParams } from './sms.adapter.interface'
import { AwsSmsAdapter } from './aws-sms.adapter'

const mockGetEnvConfig = getEnvConfig as jest.Mock
const mockClientCtor = PinpointSMSVoiceV2Client as unknown as jest.Mock
const mockCommandCtor = SendTextMessageCommand as unknown as jest.Mock

// Pass-through breaker so fire() calls the underlying send() directly.
function makePassThroughBreaker(sendFn: (params: ISendSmsParams) => Promise<unknown>) {
  return { fire: jest.fn().mockImplementation((params: ISendSmsParams) => sendFn(params)) }
}

describe('AwsSmsAdapter', () => {
  let mockBreaker: ReturnType<typeof makePassThroughBreaker>
  let breakerOptions: Record<string, unknown>
  let mockSend: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockSend = jest.fn().mockResolvedValue({ MessageId: 'msg-123' })
    mockClientCtor.mockImplementation(() => ({ send: mockSend }))
    mockGetEnvConfig.mockReturnValue({
      AWS_REGION: 'us-east-1',
      AWS_SMS_ORIGINATION_IDENTITY: 'sender-id-1',
      AWS_SMS_CONFIG_SET: 'cfg-set',
    })
  })

  function buildAdapter() {
    ;(CircuitBreakerModule as unknown as jest.Mock).mockImplementation((fn: any, opts: any) => {
      breakerOptions = opts
      mockBreaker = makePassThroughBreaker(fn)
      return mockBreaker
    })
    return new AwsSmsAdapter()
  }

  it('fires the circuit breaker with the params', async () => {
    const adapter = buildAdapter()
    await adapter.sendSms({ toE164: '+5511999999999', body: 'oi' })
    expect(mockBreaker.fire).toHaveBeenCalledWith({ toE164: '+5511999999999', body: 'oi' })
  })

  it('sends a TRANSACTIONAL text message with the configured origination + config set', async () => {
    const adapter = buildAdapter()

    const result = await adapter.sendSms({ toE164: '+5511999999999', body: 'Lembrete' })

    expect(mockCommandCtor).toHaveBeenCalledWith({
      DestinationPhoneNumber: '+5511999999999',
      OriginationIdentity: 'sender-id-1',
      MessageBody: 'Lembrete',
      MessageType: 'TRANSACTIONAL',
      ConfigurationSetName: 'cfg-set',
    })
    expect(mockSend).toHaveBeenCalledWith({ __type: 'SendTextMessageCommand', input: expect.any(Object) })
    expect(result).toEqual({ status: 'sent', providerMessageId: 'msg-123' })
  })

  it('constructs the client with the configured region and retry attempts', async () => {
    const adapter = buildAdapter()
    await adapter.sendSms({ toE164: '+5511999999999', body: 'oi' })
    expect(mockClientCtor).toHaveBeenCalledWith({ region: 'us-east-1', maxAttempts: 3 })
  })

  it('defaults the region to us-east-1 when AWS_REGION is unset', async () => {
    mockGetEnvConfig.mockReturnValue({ AWS_SMS_ORIGINATION_IDENTITY: 'sender-id-1' })
    const adapter = buildAdapter()
    await adapter.sendSms({ toE164: '+5511999999999', body: 'oi' })
    expect(mockClientCtor).toHaveBeenCalledWith({ region: 'us-east-1', maxAttempts: 3 })
  })

  it('reuses the same client across sends', async () => {
    const adapter = buildAdapter()
    await adapter.sendSms({ toE164: '+5511999999999', body: 'a' })
    await adapter.sendSms({ toE164: '+5511999999999', body: 'b' })
    expect(mockClientCtor).toHaveBeenCalledTimes(1)
  })

  it('returns null providerMessageId when the provider omits MessageId', async () => {
    mockSend.mockResolvedValue({})
    const adapter = buildAdapter()
    const result = await adapter.sendSms({ toE164: '+5511999999999', body: 'oi' })
    expect(result).toEqual({ status: 'sent', providerMessageId: null })
  })

  it('skips (does not call the provider) when no origination identity is configured', async () => {
    mockGetEnvConfig.mockReturnValue({ AWS_REGION: 'us-east-1', AWS_SMS_ORIGINATION_IDENTITY: undefined })
    const adapter = buildAdapter()

    const result = await adapter.sendSms({ toE164: '+5511999999999', body: 'oi' })

    expect(result).toEqual({ status: 'skipped', providerMessageId: null })
    expect(mockClientCtor).not.toHaveBeenCalled()
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('propagates provider errors so the caller can record the failure', async () => {
    mockSend.mockRejectedValue(new Error('throttled'))
    const adapter = buildAdapter()
    await expect(adapter.sendSms({ toE164: '+5511999999999', body: 'oi' })).rejects.toThrow('throttled')
  })

  it('configures the circuit breaker with a timeout and reset window', () => {
    buildAdapter()
    expect(breakerOptions).toMatchObject({
      timeout: 10000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
    })
  })
})
