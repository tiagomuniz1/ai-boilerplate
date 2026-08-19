import { AppointmentReminder, ReminderChannel, ReminderStatus } from '../entities/appointment-reminder.entity'

/**
 * A scheduled/confirmed appointment joined with the data needed to build and
 * deliver a reminder message. Deliberately a flat read projection (not the
 * Appointment entity) so the reminder job stays self-contained in this module.
 */
export interface ReminderCandidate {
  appointmentId: string
  clinicId: string
  clinicName: string
  date: string // 'YYYY-MM-DD'
  startTime: string // 'HH:MM'
  patientName: string
  patientPhone: string
  professionalName: string
}

export abstract class IAppointmentRemindersRepository {
  /**
   * Upcoming scheduled/confirmed appointments (of active clinics) whose date is
   * within [dateFrom, dateTo]. Cross-clinic (no clinic filter) — the reminder
   * cron runs for the whole platform.
   */
  abstract findDueCandidates(dateFrom: string, dateTo: string): Promise<ReminderCandidate[]>

  /**
   * Atomically reserves the (appointment, offset) reminder slot. Inserts a row
   * with the given status; returns the created row, or null when a row already
   * exists (unique conflict) — the send-once guarantee across instances.
   */
  abstract claim(
    appointmentId: string,
    clinicId: string,
    offsetLabel: string,
    channel: ReminderChannel,
    status: ReminderStatus,
  ): Promise<AppointmentReminder | null>

  abstract markSent(id: string, providerMessageId: string | null): Promise<void>

  abstract markFailed(id: string, error: string): Promise<void>

  /**
   * Releases a provisional claim (deletes the row) so the (appointment, offset)
   * can be re-attempted on a later tick. Used when the send was skipped for a
   * transient/config reason (e.g. the SMS origination isn't configured yet) —
   * unlike a permanent skip (invalid phone), which stays recorded.
   */
  abstract release(id: string): Promise<void>
}
