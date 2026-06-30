import { AppointmentStatus } from '@app/shared'

export const APPOINTMENT_STATUS_BADGE_CLASS: Record<AppointmentStatus, string> = {
  [AppointmentStatus.SCHEDULED]: 'bg-accent/10 text-accent',
  [AppointmentStatus.CONFIRMED]: 'bg-accent/20 text-accent',
  [AppointmentStatus.CANCELLED]: 'bg-danger/10 text-danger',
  [AppointmentStatus.COMPLETED]: 'bg-good/10 text-good',
  [AppointmentStatus.NO_SHOW]: 'bg-warn/10 text-warn',
}
