import { AvailableSlotDto } from '@app/shared'
import { Schedule } from '../../schedules/entities/schedule.entity'

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0')
  const m = (minutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

export function generateSlots(schedule: Schedule): AvailableSlotDto[] {
  const slots: AvailableSlotDto[] = []
  const start = timeToMinutes(schedule.startTime)
  const end = timeToMinutes(schedule.endTime)
  const duration = schedule.slotDurationInMinutes

  for (let t = start; t + duration <= end; t += duration) {
    slots.push({
      startTime: minutesToTime(t),
      endTime: minutesToTime(t + duration),
      scheduleId: schedule.id,
      slotDurationInMinutes: duration,
    })
  }
  return slots
}

interface ScheduleExceptionWindow {
  startTime: string | null
  endTime: string | null
}

/**
 * True when the slot overlaps any exception window. A null start/end on an
 * exception means the block is open-ended (start of day / end of day) — a
 * fully-null exception blocks the whole day.
 */
export function isSlotBlockedByExceptions(
  slot: { startTime: string; endTime: string },
  exceptions: ScheduleExceptionWindow[],
): boolean {
  if (exceptions.length === 0) return false
  const slotStart = timeToMinutes(slot.startTime)
  const slotEnd = timeToMinutes(slot.endTime)
  return exceptions.some((exception) => {
    const blockStart = exception.startTime ? timeToMinutes(exception.startTime) : 0
    const blockEnd = exception.endTime ? timeToMinutes(exception.endTime) : 24 * 60
    return slotStart < blockEnd && slotEnd > blockStart
  })
}
