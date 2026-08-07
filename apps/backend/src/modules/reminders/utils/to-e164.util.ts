/**
 * Normalizes a raw Brazilian phone number to E.164 (e.g. "+5511998765432"),
 * which is what AWS End User Messaging requires as the destination.
 *
 * Accepts numbers with or without the +55 country code and with any separators
 * (spaces, parentheses, dashes). Returns null when the result is not a plausible
 * Brazilian number so the caller can skip sending instead of hitting the provider
 * with garbage.
 *
 * Valid national number (after the 55): 10 digits (landline: 2 DDD + 8) or
 * 11 digits (mobile: 2 DDD + 9). So the full E.164 digit count is 12 or 13.
 */
export function toE164BrazilPhone(raw: string | null | undefined): string | null {
  if (!raw) return null

  let digits = raw.replace(/\D/g, '')
  if (digits.length === 0) return null

  // Drop a leading international trunk prefix "00" if present (e.g. 005511...).
  if (digits.startsWith('00')) digits = digits.slice(2)

  // Add the country code when the number came in as a national number.
  if (!digits.startsWith('55')) {
    if (digits.length === 10 || digits.length === 11) {
      digits = `55${digits}`
    } else {
      return null
    }
  }

  // Now digits must be 55 + (10 or 11) national digits → total 12 or 13.
  if (digits.length !== 12 && digits.length !== 13) return null

  // Reject an invalid DDD (area codes are 11–99; the first digit is never 0).
  const ddd = digits.slice(2, 4)
  if (ddd[0] === '0') return null

  return `+${digits}`
}
