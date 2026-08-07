export interface ISendSmsParams {
  toE164: string
  body: string
}

export interface ISendSmsResult {
  status: 'sent' | 'skipped'
  providerMessageId: string | null
}

export abstract class ISmsAdapter {
  abstract sendSms(params: ISendSmsParams): Promise<ISendSmsResult>
}
