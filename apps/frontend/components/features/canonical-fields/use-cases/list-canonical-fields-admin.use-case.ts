import { canonicalFieldsAdminService } from '../services/canonical-fields-admin.service'
import { toCanonicalFieldModel } from '../mappers/to-canonical-field-model.mapper'
import type { ICanonicalFieldModel, ICanonicalFieldListParams } from '../types/canonical-field-model.types'

export async function listCanonicalFieldsAdminUseCase(
  params?: ICanonicalFieldListParams,
): Promise<ICanonicalFieldModel[]> {
  const dtos = await canonicalFieldsAdminService.getAll(params)
  return dtos.map((dto) => toCanonicalFieldModel(dto))
}
