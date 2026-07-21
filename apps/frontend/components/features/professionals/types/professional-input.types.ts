import type { CouncilType } from '@app/shared'

export interface IProfessionalRegistrationInput {
  councilType: CouncilType
  number: string
  state: string
  isPrimary: boolean
}

export interface IProfessionalSpecialtyInput {
  specialtyId: string
  registryNumber?: string
}

export interface ICreateProfessionalInput {
  userId?: string
  fullName?: string
  email?: string
  registrations: IProfessionalRegistrationInput[]
  specialties: IProfessionalSpecialtyInput[]
  bio?: string
}

export interface IUpdateProfessionalInput {
  registrations?: IProfessionalRegistrationInput[]
  specialties?: IProfessionalSpecialtyInput[]
  bio?: string
  isActive?: boolean
}

export interface IProfessionalListParams {
  search?: string
  page?: number
  limit?: number
}
