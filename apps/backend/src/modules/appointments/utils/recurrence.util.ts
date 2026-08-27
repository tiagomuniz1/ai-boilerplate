import { DayOfWeek, MAXIMUM_RECURRENCE_HORIZON_IN_DAYS, MAXIMUM_RECURRING_OCCURRENCES } from '@app/shared'

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

const UTC_DAY_TO_DAY_OF_WEEK: Record<number, DayOfWeek> = {
  0: DayOfWeek.SUNDAY,
  1: DayOfWeek.MONDAY,
  2: DayOfWeek.TUESDAY,
  3: DayOfWeek.WEDNESDAY,
  4: DayOfWeek.THURSDAY,
  5: DayOfWeek.FRIDAY,
  6: DayOfWeek.SATURDAY,
}

/**
 * Calendar arithmetic is anchored at UTC midnight, matching how
 * GetActiveSchedulesForProfessionalUseCase derives the weekday. Local-time
 * getters would drift between the UTC container and a UTC-3 dev machine.
 * Comparisons against "now" use the -03:00 anchor instead — see
 * create-appointment.use-case.ts.
 */
function toUtcDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`)
}

export function addDaysUtc(date: string, days: number): string {
  const result = toUtcDate(date)
  result.setUTCDate(result.getUTCDate() + days)
  return result.toISOString().slice(0, 10)
}

export function differenceInDays(fromDate: string, toDate: string): number {
  return Math.round((toUtcDate(toDate).getTime() - toUtcDate(fromDate).getTime()) / MILLISECONDS_PER_DAY)
}

export function getDayOfWeekFromDate(date: string): DayOfWeek {
  return UTC_DAY_TO_DAY_OF_WEEK[toUtcDate(date).getUTCDay()]
}

/**
 * True when `candidateDate` is the anchor itself or one of its repetitions —
 * same weekday, and a whole number of intervals away. Guards the batch endpoint
 * against a client submitting arbitrary dates to bypass the recurrence rule.
 */
export function isOnRecurrenceGrid(
  anchorDate: string,
  candidateDate: string,
  intervalInWeeks: number,
): boolean {
  const difference = differenceInDays(anchorDate, candidateDate)
  if (difference < 0) return false
  return difference % (7 * intervalInWeeks) === 0
}

export interface GeneratedRecurrence {
  dates: string[]
  truncatedByMaximumOccurrences: boolean
  truncatedByHorizon: boolean
}

export interface GenerateRecurringDatesParams {
  anchorDate: string
  intervalInWeeks: number
  occurrenceCount?: number
  untilDate?: string
}

/**
 * Expands a recurrence rule into concrete dates. The anchor is occurrence #1.
 * Whichever limit is reached first ends the series; the two truncation flags let
 * the caller tell "the rule ended" apart from "the system capped it".
 */
export function generateRecurringDates(params: GenerateRecurringDatesParams): GeneratedRecurrence {
  const { anchorDate, intervalInWeeks, occurrenceCount, untilDate } = params
  const stepInDays = 7 * intervalInWeeks

  const dates: string[] = []
  let truncatedByMaximumOccurrences = false
  let truncatedByHorizon = false

  for (let index = 0; ; index += 1) {
    const candidate = addDaysUtc(anchorDate, index * stepInDays)

    if (occurrenceCount !== undefined && dates.length >= occurrenceCount) break
    if (untilDate !== undefined && candidate > untilDate) break

    if (dates.length >= MAXIMUM_RECURRING_OCCURRENCES) {
      truncatedByMaximumOccurrences = true
      break
    }
    if (differenceInDays(anchorDate, candidate) > MAXIMUM_RECURRENCE_HORIZON_IN_DAYS) {
      truncatedByHorizon = true
      break
    }

    dates.push(candidate)
  }

  return { dates, truncatedByMaximumOccurrences, truncatedByHorizon }
}
