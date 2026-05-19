export abstract class INotificationAdapter {
  abstract sendAccountActivationEmail(to: string, fullName: string): Promise<void>
}
