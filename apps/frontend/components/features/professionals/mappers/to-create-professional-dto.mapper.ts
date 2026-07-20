import type { CreateProfessionalDto } from '@app/shared'
import type { ICreateProfessionalInput } from '../types/professional-input.types'

export function toCreateProfessionalDto(input: ICreateProfessionalInput): CreateProfessionalDto {
  return {
    userId: input.userId,
    fullName: input.fullName,
    email: input.email,
    registrations: input.registrations,
    specialties: input.specialties,
    bio: input.bio,
  }
}
