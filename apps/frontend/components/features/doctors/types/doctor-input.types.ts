export interface ICreateDoctorInput {
  userId: string
  crmNumber: string
  specialty: string
  bio?: string
}

export interface IUpdateDoctorInput {
  crmNumber?: string
  specialty?: string
  bio?: string
}

export interface IDoctorListParams {
  search?: string
  page?: number
  limit?: number
}
