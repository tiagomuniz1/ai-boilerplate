import type { CouncilType } from '@app/shared'

export interface IProfessionalUserModel {
  id: string
  fullName: string
  email: string
  isActive: boolean
}

export interface IProfessionalRegistrationModel {
  id: string
  councilType: CouncilType
  number: string
  state: string
  isPrimary: boolean
}

export interface IProfessionalSpecialtyModel {
  id: string
  name: string
  registryNumber: string | null
}

export interface IProfessionalModel {
  id: string
  user: IProfessionalUserModel
  registrations: IProfessionalRegistrationModel[]
  specialties: IProfessionalSpecialtyModel[]
  bio: string | null
  createdAt: Date
  updatedAt: Date
}
