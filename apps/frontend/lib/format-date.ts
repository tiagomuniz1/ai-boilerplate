/**
 * Formats an ISO date string (`YYYY-MM-DD` or full ISO) into Brazilian format `DD/MM/YYYY`.
 * Parses the string directly (no `Date` object) so the result is not shifted by timezone.
 * Returns the original string when it does not match the expected shape.
 */
export function formatDateToBR(date: string): string {
  const datePart = date.split('T')[0]
  const [year, month, day] = datePart.split('-')

  if (!year || !month || !day) return date

  return `${day}/${month}/${year}`
}

/**
 * Formats a `Date` object into `YYYY-MM-DD` using its local calendar date.
 * Uses local getters (not `toISOString`, which converts to UTC) so the result
 * does not shift to the next or previous day depending on the timezone offset
 * and time of day — e.g. `toISOString()` on "now" late in the evening in a
 * UTC-behind timezone rolls over into tomorrow's UTC date.
 */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const WEEKDAY_NAMES_PT_BR = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
]

/**
 * Weekday name for a `YYYY-MM-DD` string, e.g. "terça-feira".
 * Parses at local midnight (`T00:00:00`) — `new Date('YYYY-MM-DD')` is parsed as
 * UTC and lands on the previous evening in a UTC-behind timezone, yielding the
 * wrong weekday.
 */
export function getWeekdayNamePtBR(date: string): string {
  const parsed = new Date(`${date.split('T')[0]}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return ''
  return WEEKDAY_NAMES_PT_BR[parsed.getDay()]
}

/**
 * The Sunday that opens the calendar week containing `date`.
 * The agenda's week grid and its toolbar label must derive the week from this
 * single function: computing the week independently in each one lets the label
 * describe a different week than the grid renders whenever the selected date is
 * not already a Sunday.
 */
export function getWeekStart(date: Date): Date {
  const start = new Date(date)
  start.setDate(start.getDate() - start.getDay())
  return start
}
