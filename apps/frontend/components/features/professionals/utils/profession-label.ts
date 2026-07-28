import { COUNCIL_TYPE_LABELS, COUNCIL_TYPE_PROFESSION_LABELS } from '@app/shared'
import type { IProfessionalRegistrationModel } from '../types/professional-model.types'

export function primaryRegistration(
  registrations: IProfessionalRegistrationModel[],
): IProfessionalRegistrationModel | null {
  if (registrations.length === 0) return null
  return registrations.find((r) => r.isPrimary) ?? registrations[0]
}

export function primaryProfessionLabel(registrations: IProfessionalRegistrationModel[]): string {
  const primary = primaryRegistration(registrations)
  return primary ? COUNCIL_TYPE_PROFESSION_LABELS[primary.councilType] : '—'
}

export function primaryRegistrationLabel(registrations: IProfessionalRegistrationModel[]): string {
  const primary = primaryRegistration(registrations)
  if (!primary) return '—'
  const suffix = registrations.length > 1 ? ` +${registrations.length - 1}` : ''
  return `${COUNCIL_TYPE_LABELS[primary.councilType]} ${primary.number}/${primary.state}${suffix}`
}
