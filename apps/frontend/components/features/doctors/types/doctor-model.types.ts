export interface IDoctorUserModel {
  id: string
  fullName: string
  email: string
}

export interface IDoctorSpecialtyModel {
  id: string
  name: string
}

export interface IDoctorModel {
  id: string
  user: IDoctorUserModel
  crmNumber: string
  specialties: IDoctorSpecialtyModel[]
  bio: string | null
  createdAt: Date
  updatedAt: Date
}
