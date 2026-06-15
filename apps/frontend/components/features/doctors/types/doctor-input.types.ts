export interface ICreateDoctorInput {
  userId?: string
  fullName?: string
  email?: string
  crmNumber: string
  specialtyIds: string[]
  bio?: string
}

export interface IUpdateDoctorInput {
  crmNumber?: string
  specialtyIds?: string[]
  bio?: string
  isActive?: boolean
}

export interface IDoctorListParams {
  search?: string
  page?: number
  limit?: number
}
