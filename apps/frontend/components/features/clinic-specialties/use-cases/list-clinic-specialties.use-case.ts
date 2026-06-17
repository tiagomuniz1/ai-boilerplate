import { clinicSpecialtiesService } from '../services/clinic-specialties.service'
import { toClinicSpecialtyModel } from '../mappers/to-clinic-specialty-model.mapper'
import type { IPaginatedClinicSpecialtiesModel, IClinicSpecialtyListParams } from '../types/clinic-specialty.types'

export async function listClinicSpecialtiesUseCase(
  clinicId: string,
  params?: IClinicSpecialtyListParams,
): Promise<IPaginatedClinicSpecialtiesModel> {
  const dto = await clinicSpecialtiesService.getAll(clinicId, params)
  return {
    data: dto.data.map((item) => toClinicSpecialtyModel(item)),
    total: dto.total,
    page: dto.page,
    limit: dto.limit,
  }
}
