export interface IDoctorCrmInput {
  number: string
  state: string
  isPrimary: boolean
}

export interface IDoctorSpecialtyInput {
  specialtyId: string
  rqe?: string
}

export interface ICreateDoctorInput {
  userId?: string
  fullName?: string
  email?: string
  crms: IDoctorCrmInput[]
  specialties: IDoctorSpecialtyInput[]
  bio?: string
}

export interface IUpdateDoctorInput {
  crms?: IDoctorCrmInput[]
  specialties?: IDoctorSpecialtyInput[]
  bio?: string
  isActive?: boolean
}

export interface IDoctorListParams {
  search?: string
  page?: number
  limit?: number
}
