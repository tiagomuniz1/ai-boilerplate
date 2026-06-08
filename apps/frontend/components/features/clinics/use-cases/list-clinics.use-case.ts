import { clinicsService } from '../services/clinics.service'
import { toClinicModel } from '../mappers/to-clinic-model'
import type { IClinicListParams, IPaginatedClinics } from '../types/clinic.types'

export async function listClinicsUseCase(params?: IClinicListParams): Promise<IPaginatedClinics> {
  const response = await clinicsService.getAll(params)
  return {
    data: response.data.map(toClinicModel),
    total: response.total,
    page: response.page,
    limit: response.limit,
  }
}
