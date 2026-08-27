import { UnprocessableEntityException } from '@nestjs/common'

export interface ProfessionalSpecialtyOption {
  id: string
  name: string
}

/**
 * Picks the specialty an appointment is filed under. A professional with no
 * specialties is a generalist and books without one; with exactly one it is
 * resolved automatically; with more than one the caller must choose.
 */
export function resolveSpecialty(
  specialties: ProfessionalSpecialtyOption[],
  requestedSpecialtyId?: string,
): ProfessionalSpecialtyOption | null {
  if (requestedSpecialtyId) {
    const matched = specialties.find((specialty) => specialty.id === requestedSpecialtyId)
    if (!matched) {
      throw new UnprocessableEntityException('Specialty does not belong to this professional')
    }
    return matched
  }

  if (specialties.length === 0) {
    return null
  }

  if (specialties.length > 1) {
    throw new UnprocessableEntityException('specialtyId is required')
  }

  return specialties[0]
}
