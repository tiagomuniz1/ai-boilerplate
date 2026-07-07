export interface IDoctorUserModel {
  id: string
  fullName: string
  email: string
  isActive: boolean
}

export interface IDoctorCrmModel {
  id: string
  number: string
  state: string
  isPrimary: boolean
}

export interface IDoctorSpecialtyModel {
  id: string
  name: string
  rqe: string | null
}

export interface IDoctorModel {
  id: string
  user: IDoctorUserModel
  crms: IDoctorCrmModel[]
  specialties: IDoctorSpecialtyModel[]
  bio: string | null
  createdAt: Date
  updatedAt: Date
}
