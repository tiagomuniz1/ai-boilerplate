export interface IClinicSpecialtyModel {
  id: string
  clinicId: string
  specialtyId: string
  name: string
  description: string | null
  linkedAt: Date
}

export interface IPaginatedClinicSpecialtiesModel {
  data: IClinicSpecialtyModel[]
  total: number
  page: number
  limit: number
}

export interface IClinicSpecialtyListParams {
  search?: string
  page?: number
  limit?: number
}
