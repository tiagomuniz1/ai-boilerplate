export interface IVaccineModel {
  id: string
  name: string
  abbreviation: string | null
  preventedDiseases: string | null
  isActive: boolean
  createdAt: Date
}

export interface IPaginatedVaccines {
  data: IVaccineModel[]
  total: number
  page: number
  limit: number
}

export interface IVaccineListParams {
  search?: string
  includeInactive?: boolean
  page?: number
  limit?: number
}
