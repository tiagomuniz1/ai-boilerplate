import { CouncilType } from '../enums/council-type.enum'

export class ProfessionalUserDto {
  id!: string
  fullName!: string
  email!: string
  isActive!: boolean
}

export class ProfessionalRegistrationDto {
  id!: string
  councilType!: CouncilType
  number!: string
  state!: string
  isPrimary!: boolean
}

export class ProfessionalSpecialtyDto {
  id!: string
  name!: string
  registryNumber!: string | null
}

export class ProfessionalResponseDto {
  id!: string
  user!: ProfessionalUserDto
  registrations!: ProfessionalRegistrationDto[]
  specialties!: ProfessionalSpecialtyDto[]
  bio!: string | null
  createdAt!: Date
  updatedAt!: Date
}
