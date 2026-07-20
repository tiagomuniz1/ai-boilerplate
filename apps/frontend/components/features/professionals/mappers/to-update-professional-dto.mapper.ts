import type { UpdateProfessionalDto } from '@app/shared'
import type { IUpdateProfessionalInput } from '../types/professional-input.types'

export function toUpdateProfessionalDto(input: IUpdateProfessionalInput): UpdateProfessionalDto {
  return {
    registrations: input.registrations,
    specialties: input.specialties,
    bio: input.bio,
    isActive: input.isActive,
  }
}
