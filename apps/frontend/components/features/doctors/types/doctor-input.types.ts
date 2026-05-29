export interface ICreateDoctorInput {
  userId: string
  crmNumber: string
  specialtyIds: string[]
  bio?: string
}

export interface IUpdateDoctorInput {
  crmNumber?: string
  specialtyIds?: string[]
  bio?: string
}

export interface IDoctorListParams {
  search?: string
  page?: number
  limit?: number
}
