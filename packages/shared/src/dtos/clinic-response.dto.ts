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
  themeId!: string | null
  logoUrl!: string | null
  faviconUrl!: string | null
  address!: AddressResponseDto | null
  createdAt!: Date
  updatedAt!: Date
}
