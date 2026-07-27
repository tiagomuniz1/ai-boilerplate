export interface IAddressModel {
  street: string
  number: string
  complement: string | null
  neighborhood: string
  city: string
  state: string
  zipCode: string
  country: string
}

export interface IAddressInput {
  street: string
  number: string
  complement?: string | null
  neighborhood: string
  city: string
  state: string
  zipCode: string
  country?: string
}

export interface IClinicModel {
  id: string
  name: string
  slug: string
  isActive: boolean
  themeId: string | null
  logoUrl: string | null
  logoDarkUrl: string | null
  faviconUrl: string | null
  address: IAddressModel | null
  createdAt: Date
  updatedAt: Date
}

export interface ICreateClinicInput {
  name: string
  slug?: string
  themeId?: string | null
  address: IAddressInput
}

export interface IUpdateClinicInput {
  name?: string
  slug?: string
  isActive?: boolean
  themeId?: string | null
  address?: IAddressInput
}

export interface IClinicListParams {
  page?: number
  limit?: number
  search?: string
}

export interface IPaginatedClinics {
  data: IClinicModel[]
  total: number
  page: number
  limit: number
}
