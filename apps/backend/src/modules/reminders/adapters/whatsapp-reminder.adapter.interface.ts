export interface ISendWhatsAppReminderParams {
  toE164: string
  /** Values for the approved WhatsApp content template's variables (keyed by index/name). */
  variables: Record<string, string>
}

export interface ISendWhatsAppReminderResult {
  status: 'sent' | 'skipped'
  providerMessageId: string | null
}

export abstract class IWhatsAppReminderAdapter {
  abstract sendReminder(params: ISendWhatsAppReminderParams): Promise<ISendWhatsAppReminderResult>
}
