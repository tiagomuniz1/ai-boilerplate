import { UnprocessableEntityException } from '@nestjs/common'
import { Doctor } from '../entities/doctor.entity'

export interface DoctorSigningIdentity {
  crmNumber: string
  rqe: string | null
  specialtyName: string | null
}

/**
 * Resolves the CRM number, RQE and specialty/profession title used to sign a
 * prescription, medical certificate or exam request.
 *
 * - CRM: defaults to the doctor's primary CRM; `crmId` overrides it (must belong to the doctor).
 * - Specialty: defaults to the appointment's specialty; `specialtyId` overrides it (must be one
 *   the doctor is registered in). The chosen registration carries the RQE and the profession
 *   title (`specialty.titleName`, falling back to `specialty.name`).
 *
 * Throws `UnprocessableEntityException` when an explicitly provided `crmId`/`specialtyId` does
 * not belong to the doctor. When falling back to the defaults, missing data resolves silently
 * to empty/null, preserving the previous behaviour.
 */
export function resolveDoctorSigningIdentity(
  doctor: Doctor,
  appointmentSpecialtyId: string | null,
  crmId?: string,
  specialtyId?: string,
): DoctorSigningIdentity {
  let selectedCrm = doctor.crms.find((crm) => crm.isPrimary) ?? null
  if (crmId) {
    selectedCrm = doctor.crms.find((crm) => crm.id === crmId) ?? null
    if (!selectedCrm) throw new UnprocessableEntityException('CRM not found for this doctor')
  }
  const crmNumber = selectedCrm ? `${selectedCrm.number}/${selectedCrm.state}` : ''

  const targetSpecialtyId = specialtyId ?? appointmentSpecialtyId
  const signingSpecialty = targetSpecialtyId
    ? (doctor.doctorSpecialties.find((ds) => ds.specialtyId === targetSpecialtyId) ?? null)
    : null
  if (specialtyId && !signingSpecialty) {
    throw new UnprocessableEntityException('Specialty not found for this doctor')
  }

  const specialtyName = signingSpecialty
    ? (signingSpecialty.specialty.titleName ?? signingSpecialty.specialty.name)
    : null
  const rqe = signingSpecialty?.rqe ?? null

  return { crmNumber, rqe, specialtyName }
}
