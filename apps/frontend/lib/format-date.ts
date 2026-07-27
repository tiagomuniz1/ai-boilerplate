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
