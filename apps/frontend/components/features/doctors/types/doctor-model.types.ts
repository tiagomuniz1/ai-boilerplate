export interface IDoctorUserModel {
  id: string
  fullName: string
  email: string
}

export interface IDoctorModel {
  id: string
  user: IDoctorUserModel
  crmNumber: string
  specialty: string
  bio: string | null
  createdAt: Date
  updatedAt: Date
}
