export interface ISpecialtyModel {
  id: string
  name: string
  description: string | null
  clinicCount: number
  createdAt: Date
  updatedAt: Date
}

export interface IPaginatedSpecialtiesModel {
  data: ISpecialtyModel[]
  total: number
  page: number
  limit: number
}

export interface ISpecialtyListParams {
  search?: string
  page?: number
  limit?: number
}
