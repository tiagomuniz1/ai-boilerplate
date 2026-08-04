export abstract class ICaptchaAdapter {
  abstract verify(token: string, remoteIp?: string): Promise<boolean>
}
