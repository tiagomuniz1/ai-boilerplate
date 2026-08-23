import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AppointmentReminder, ReminderChannel, ReminderStatus } from '../entities/appointment-reminder.entity'
import { IAppointmentRemindersRepository, ReminderCandidate } from './appointment-reminders.repository.interface'

@Injectable()
export class AppointmentRemindersRepository implements IAppointmentRemindersRepository {
  constructor(
    @InjectRepository(AppointmentReminder)
    private readonly repository: Repository<AppointmentReminder>,
  ) {}

  async findDueCandidates(dateFrom: string, dateTo: string): Promise<ReminderCandidate[]> {
    // Cross-table read projection (appointments + patient/professional names +
    // clinic). Cross-clinic (no clinic filter), only active clinics / non-deleted
    // rows. Raw parameterized SQL so table names are qualified with the configured
    // schema (entity-based query builders auto-qualify, raw table names do not).
    const rawSchema = (this.repository.manager.connection?.options as { schema?: string })?.schema ?? 'public'
    // Schema comes from our own config, never user input; still guard the identifier.
    const schema = /^[A-Za-z_][A-Za-z0-9_]*$/.test(rawSchema) ? rawSchema : 'public'

    const rows: ReminderCandidate[] = await this.repository.manager.query(
      `SELECT a.id                            AS "appointmentId",
              a.clinic_id                     AS "clinicId",
              c.name                          AS "clinicName",
              to_char(a.date, 'YYYY-MM-DD')   AS "date",
              a.start_time                    AS "startTime",
              pu.full_name                    AS "patientName",
              p.phone_number                  AS "patientPhone",
              du.full_name                    AS "professionalName"
       FROM ${schema}.appointments a
       INNER JOIN ${schema}.patients p      ON p.id = a.patient_id       AND p.deleted_at IS NULL
       INNER JOIN ${schema}.users pu        ON pu.id = p.user_id         AND pu.deleted_at IS NULL
       INNER JOIN ${schema}.professionals d ON d.id = a.professional_id  AND d.deleted_at IS NULL
       INNER JOIN ${schema}.users du        ON du.id = d.user_id         AND du.deleted_at IS NULL
       INNER JOIN ${schema}.clinics c       ON c.id = a.clinic_id        AND c.deleted_at IS NULL AND c.is_active = true
       WHERE a.deleted_at IS NULL
         AND a.status IN ('scheduled', 'confirmed')
         AND a.date BETWEEN $1 AND $2`,
      [dateFrom, dateTo],
    )

    return rows
  }

  async claim(
    appointmentId: string,
    clinicId: string,
    offsetLabel: string,
    channel: ReminderChannel,
    status: ReminderStatus,
  ): Promise<AppointmentReminder | null> {
    const result = await this.repository
      .createQueryBuilder()
      .insert()
      .into(AppointmentReminder)
      .values({ appointmentId, clinicId, offsetLabel, channel, status, providerMessageId: null, error: null })
      .orIgnore() // ON CONFLICT (appointment_id, offset_label) DO NOTHING
      .returning('*')
      .execute()

    const raw = result.raw?.[0]
    if (!raw) return null

    return this.repository.create({
      id: raw.id,
      appointmentId,
      clinicId,
      offsetLabel,
      channel,
      status,
      providerMessageId: null,
      error: null,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    })
  }

  async markSent(id: string, providerMessageId: string | null): Promise<void> {
    await this.repository.update(id, { status: 'sent', providerMessageId })
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.repository.update(id, { status: 'failed', error: error.slice(0, 500) })
  }

  async release(id: string): Promise<void> {
    await this.repository.delete(id)
  }
}
