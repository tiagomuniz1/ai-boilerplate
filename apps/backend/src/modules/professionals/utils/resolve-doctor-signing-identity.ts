import { UnprocessableEntityException } from '@nestjs/common'
import { Professional } from '../entities/professional.entity'

export interface DoctorSigningIdentity {
  crmNumber: string
  rqe: string | null
  specialtyName: string | null
}

/**
 * Resolves the CRM number, RQE and specialty/profession title used to sign a
 * prescription, medical certificate or exam request.
 *
 * - CRM: defaults to the professional's primary registration; `crmId` overrides it (must belong
 *   to the professional).
 * - Specialty: defaults to the appointment's specialty; `specialtyId` overrides it (must be one
 *   the professional is registered in). The chosen registration carries the RQE and the profession
 *   title (`specialty.titleName`, falling back to `specialty.name`).
 *
 * Throws `UnprocessableEntityException` when an explicitly provided `crmId`/`specialtyId` does
 * not belong to the professional. When falling back to the defaults, missing data resolves
 * silently to empty/null, preserving the previous behaviour.
 */
export function resolveDoctorSigningIdentity(
  professional: Professional,
  appointmentSpecialtyId: string | null,
  crmId?: string,
  specialtyId?: string,
): DoctorSigningIdentity {
  let selectedRegistration = professional.registrations.find((registration) => registration.isPrimary) ?? null
  if (crmId) {
    selectedRegistration = professional.registrations.find((registration) => registration.id === crmId) ?? null
    if (!selectedRegistration) throw new UnprocessableEntityException('CRM not found for this doctor')
  }
  const crmNumber = selectedRegistration ? `${selectedRegistration.number}/${selectedRegistration.state}` : ''

  const targetSpecialtyId = specialtyId ?? appointmentSpecialtyId
  const signingSpecialty = targetSpecialtyId
    ? (professional.professionalSpecialties.find((ps) => ps.specialtyId === targetSpecialtyId) ?? null)
    : null
  if (specialtyId && !signingSpecialty) {
    throw new UnprocessableEntityException('Specialty not found for this doctor')
  }

  const specialtyName = signingSpecialty
    ? (signingSpecialty.specialty.titleName ?? signingSpecialty.specialty.name)
    : null
  const rqe = signingSpecialty?.registryNumber ?? null

  return { crmNumber, rqe, specialtyName }
}
