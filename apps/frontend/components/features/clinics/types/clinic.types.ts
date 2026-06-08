export interface IClinicModel {
  id: string
  name: string
  slug: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ICreateClinicInput {
  name: string
  slug?: string
}

export interface IUpdateClinicInput {
  name?: string
  slug?: string
  isActive?: boolean
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

export interface IRegisterClinicInput {
  clinicName: string
  slug?: string
  adminFullName: string
  adminEmail: string
  adminPassword: string
  adminPasswordConfirm: string
}
