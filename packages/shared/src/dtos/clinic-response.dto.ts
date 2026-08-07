import { SubscriptionPlan } from '../enums/subscription-plan.enum'

export class AddressResponseDto {
  street!: string
  number!: string
  complement!: string | null
  neighborhood!: string
  city!: string
  state!: string
  zipCode!: string
  country!: string
}

export class ClinicResponseDto {
  id!: string
  name!: string
  slug!: string
  isActive!: boolean
  plan!: SubscriptionPlan
  // Current number of professionals registered in the clinic. Populated only by
  // find-by-id (for the backoffice "X / Y professionals" usage indicator); the
  // paginated list leaves it undefined to keep that query cheap.
  professionalCount?: number
  themeId!: string | null
  logoUrl!: string | null
  logoDarkUrl!: string | null
  faviconUrl!: string | null
  address!: AddressResponseDto | null
  createdAt!: Date
  updatedAt!: Date
}
