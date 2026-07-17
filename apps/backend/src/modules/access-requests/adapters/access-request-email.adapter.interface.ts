export interface ISendAccessRequestEmailParams {
  fullName: string
  email: string
  clinicName: string
  phone?: string
}

export abstract class IAccessRequestEmailAdapter {
  abstract sendAccessRequestEmail(params: ISendAccessRequestEmailParams): Promise<void>
}
