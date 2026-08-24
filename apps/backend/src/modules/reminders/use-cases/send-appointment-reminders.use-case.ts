import { ConflictException, Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { getEnvConfig } from '../../../config/env.config'
import { DistributedLockService } from '../../../cache/distributed-lock.service'
import { IWhatsAppReminderAdapter } from '../adapters/whatsapp-reminder.adapter.interface'
import { ReminderCandidate } from '../repositories/appointment-reminders.repository.interface'
import { IAppointmentRemindersRepository } from '../repositories/appointment-reminders.repository.interface'
import { toE164BrazilPhone } from '../utils/to-e164.util'

interface ReminderOffset {
  label: string
  ms: number
}

const HOUR_MS = 60 * 60 * 1000
const DEFAULT_OFFSETS: ReminderOffset[] = [
  { label: '24h', ms: 24 * HOUR_MS },
  { label: '3h', ms: 3 * HOUR_MS },
]
// A reminder fires on the first tick after its target time; the window bounds
// that to just after the target so each offset fires once and the 24h reminder
// never overlaps the 3h one. Must be >= the cron interval so a tick always lands.
const WINDOW_MS = 15 * 60 * 1000
const CHANNEL = 'whatsapp' as const
// Brazil is UTC-3 (DST abolished in 2019); appointment date/time are clinic-local
// strings, matching how create-appointment parses them.
const BRAZIL_UTC_OFFSET = '-03:00'

@Injectable()
export class SendAppointmentRemindersUseCase extends BaseUseCase {
  private readonly logger = new Logger(SendAppointmentRemindersUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly remindersRepository: IAppointmentRemindersRepository,
    private readonly whatsAppAdapter: IWhatsAppReminderAdapter,
    private readonly distributedLockService: DistributedLockService,
  ) {
    super(dataSource)
  }

  async execute(now: Date = new Date()): Promise<void> {
    try {
      await this.distributedLockService.runWithLock('reminders:tick', 300, () => this.runTick(now))
    } catch (error) {
      // A peer instance already holds the tick lock — this is expected, no-op.
      if (error instanceof ConflictException) return
      this.logger.warn('Reminder tick failed', {
        context: SendAppointmentRemindersUseCase.name,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  private async runTick(now: Date): Promise<void> {
    const offsets = this.resolveOffsets()
    const { dateFrom, dateTo } = this.candidateDateRange(now, offsets)
    const candidates = await this.remindersRepository.findDueCandidates(dateFrom, dateTo)

    for (const candidate of candidates) {
      const appointmentAt = new Date(`${candidate.date}T${candidate.startTime}:00${BRAZIL_UTC_OFFSET}`)
      for (const offset of offsets) {
        if (this.isDue(now, appointmentAt, offset.ms)) {
          await this.sendReminder(candidate, appointmentAt, offset.label)
        }
      }
    }
  }

  private isDue(now: Date, appointmentAt: Date, offsetMs: number): boolean {
    const target = appointmentAt.getTime() - offsetMs
    const t = now.getTime()
    return t >= target && t < target + WINDOW_MS && t < appointmentAt.getTime()
  }

  private async sendReminder(candidate: ReminderCandidate, appointmentAt: Date, offsetLabel: string): Promise<void> {
    const toE164 = toE164BrazilPhone(candidate.patientPhone)
    if (!toE164) {
      await this.remindersRepository.claim(candidate.appointmentId, candidate.clinicId, offsetLabel, CHANNEL, 'skipped')
      this.logger.warn('Skipping reminder — invalid patient phone', {
        context: SendAppointmentRemindersUseCase.name,
        appointmentId: candidate.appointmentId,
      })
      return
    }

    const claimed = await this.remindersRepository.claim(
      candidate.appointmentId,
      candidate.clinicId,
      offsetLabel,
      CHANNEL,
      'pending',
    )
    if (!claimed) return // already sent/attempted for this (appointment, offset)

    const variables = this.buildTemplateVariables(candidate, appointmentAt)
    try {
      const result = await this.whatsAppAdapter.sendReminder({ toE164, variables })
      if (result.status === 'skipped') {
        // Transient/config skip (e.g. SMS origination not configured yet) — release
        // the claim so it retries on a later tick once sending is possible, instead
        // of permanently marking this appointment as skipped.
        await this.remindersRepository.release(claimed.id)
      } else {
        await this.remindersRepository.markSent(claimed.id, result.providerMessageId)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await this.remindersRepository.markFailed(claimed.id, message)
      this.logger.warn('Failed to send appointment reminder', {
        context: SendAppointmentRemindersUseCase.name,
        appointmentId: candidate.appointmentId,
        error: message,
      })
    }
  }

  // Positional variables for the approved WhatsApp content template, e.g.:
  // "Olá, {{1}}! Lembrete da sua consulta com {{2}} na {{3}} em {{4}} às {{5}}."
  private buildTemplateVariables(candidate: ReminderCandidate, appointmentAt: Date): Record<string, string> {
    const firstName = candidate.patientName.trim().split(/\s+/)[0]
    return {
      '1': firstName,
      '2': candidate.professionalName,
      '3': candidate.clinicName,
      '4': this.formatDayMonth(appointmentAt),
      '5': candidate.startTime,
    }
  }

  private formatDayMonth(date: Date): string {
    // Format in Brazil local time (UTC-3) as DD/MM.
    const local = new Date(date.getTime() - 3 * HOUR_MS)
    const day = String(local.getUTCDate()).padStart(2, '0')
    const month = String(local.getUTCMonth() + 1).padStart(2, '0')
    return `${day}/${month}`
  }

  private resolveOffsets(): ReminderOffset[] {
    const raw = getEnvConfig().REMINDER_OFFSETS_HOURS
    if (!raw) return DEFAULT_OFFSETS
    const parsed = raw
      .split(',')
      .map((part) => Number(part.trim()))
      .filter((hours) => Number.isFinite(hours) && hours > 0)
      .map((hours) => ({ label: `${hours}h`, ms: hours * HOUR_MS }))
    return parsed.length > 0 ? parsed : DEFAULT_OFFSETS
  }

  private candidateDateRange(now: Date, offsets: ReminderOffset[]): { dateFrom: string; dateTo: string } {
    // Load a coarse date range covering every offset (the precise per-offset
    // window is applied in JS). dateFrom = today (BRT); dateTo covers the largest
    // offset ahead, +1 day of slack.
    const maxOffsetMs = Math.max(...offsets.map((o) => o.ms))
    const from = this.toBrtDateString(now)
    const to = this.toBrtDateString(new Date(now.getTime() + maxOffsetMs + 24 * HOUR_MS))
    return { dateFrom: from, dateTo: to }
  }

  private toBrtDateString(date: Date): string {
    const local = new Date(date.getTime() - 3 * HOUR_MS)
    return local.toISOString().split('T')[0]
  }
}
