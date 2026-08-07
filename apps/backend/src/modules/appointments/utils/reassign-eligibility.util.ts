import { Professional } from '../../professionals/entities/professional.entity'
import { getPrimaryCouncilType } from '../../professionals/utils/get-primary-council-type.util'

/**
 * A professional is eligible to take over an appointment when they are not the
 * current professional and they match the appointment's clinical scope:
 * - specialty appointments (specialtyId != null): target must hold that specialty;
 * - generalist appointments (specialtyId == null): target's primary council must
 *   match the original professional's primary council (same profession).
 *
 * This keeps the appointment's specialtyId valid and preserves downstream
 * coherence (medical-record template resolution, document signing identity).
 */
export function isEligibleReassignTarget(
  target: Professional,
  original: Professional,
  appointmentSpecialtyId: string | null,
): boolean {
  if (target.id === original.id) return false

  if (appointmentSpecialtyId) {
    return target.professionalSpecialties.some(
      (professionalSpecialty) => professionalSpecialty.specialtyId === appointmentSpecialtyId,
    )
  }

  return getPrimaryCouncilType(target) === getPrimaryCouncilType(original)
}
