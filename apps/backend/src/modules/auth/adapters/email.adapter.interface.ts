export interface ISendSetPasswordEmailParams {
  to: string
  recipientName: string
  link: string
  clinicName?: string
  clinicLogoUrl?: string
  accentColor?: string
  accentSoftColor?: string
}

export abstract class IEmailAdapter {
  abstract sendSetPasswordEmail(params: ISendSetPasswordEmailParams): Promise<void>
}
