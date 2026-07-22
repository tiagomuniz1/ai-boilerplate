import { UnprocessableEntityException } from '@nestjs/common'
import { CouncilType } from '@app/shared'
import { Professional } from '../entities/professional.entity'

export interface ProfessionalSigningIdentity {
  councilType: CouncilType
  registrationNumber: string
  registryNumber: string | null
  specialtyName: string | null
}

/**
 * Resolves the council registration number, registry number and specialty/profession title used
 * to sign a prescription, medical certificate or exam request.
 *
 * - Registration: defaults to the professional's primary registration; `registrationId` overrides it (must
 *   belong to the professional).
 * - Specialty: defaults to the appointment's specialty; `specialtyId` overrides it (must be one
 *   the professional is registered in). The chosen registration carries the registry number and
 *   the profession title (`specialty.titleName`, falling back to `specialty.name`).
 *
 * Throws `UnprocessableEntityException` when an explicitly provided `registrationId`/`specialtyId` does
 * not belong to the professional, or when the professional has no primary registration to fall
 * back to (every professional is required to have exactly one — see `getPrimaryCouncilType`).
 */
export function resolveProfessionalSigningIdentity(
  professional: Professional,
  appointmentSpecialtyId: string | null,
  registrationId?: string,
  specialtyId?: string,
): ProfessionalSigningIdentity {
  const primaryRegistration = professional.registrations.find((registration) => registration.isPrimary)
  if (!primaryRegistration) {
    throw new UnprocessableEntityException('Professional has no primary registration')
  }

  let selectedRegistration = primaryRegistration
  if (registrationId) {
    const found = professional.registrations.find((registration) => registration.id === registrationId)
    if (!found) throw new UnprocessableEntityException('Registration not found for this professional')
    selectedRegistration = found
  }
  const councilType = selectedRegistration.councilType
  const registrationNumber = `${selectedRegistration.number}/${selectedRegistration.state}`

  const targetSpecialtyId = specialtyId ?? appointmentSpecialtyId
  const signingSpecialty = targetSpecialtyId
    ? (professional.professionalSpecialties.find((ps) => ps.specialtyId === targetSpecialtyId) ?? null)
    : null
  if (specialtyId && !signingSpecialty) {
    throw new UnprocessableEntityException('Specialty not found for this professional')
  }

  const specialtyName = signingSpecialty
    ? (signingSpecialty.specialty.titleName ?? signingSpecialty.specialty.name)
    : null
  const registryNumber = signingSpecialty?.registryNumber ?? null

  return { councilType, registrationNumber, registryNumber, specialtyName }
}
