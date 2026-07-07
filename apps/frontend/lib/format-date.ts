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
