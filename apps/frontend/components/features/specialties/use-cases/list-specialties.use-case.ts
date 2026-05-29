import { specialtiesService } from '../services/specialties.service'
import { toSpecialtyModel } from '../mappers/to-specialty-model.mapper'
import type { IPaginatedSpecialtiesModel, ISpecialtyListParams } from '../types/specialty-model.types'

export async function listSpecialtiesUseCase(
  params?: ISpecialtyListParams,
): Promise<IPaginatedSpecialtiesModel> {
  const paginatedDto = await specialtiesService.getAll(params)
  return {
    data: paginatedDto.data.map(toSpecialtyModel),
    total: paginatedDto.total,
    page: paginatedDto.page,
    limit: paginatedDto.limit,
  }
}
