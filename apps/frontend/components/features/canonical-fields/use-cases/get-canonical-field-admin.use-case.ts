import { canonicalFieldsAdminService } from '../services/canonical-fields-admin.service'
import { toCanonicalFieldModel } from '../mappers/to-canonical-field-model.mapper'
import type { ICanonicalFieldModel } from '../types/canonical-field-model.types'

export async function getCanonicalFieldAdminUseCase(id: string): Promise<ICanonicalFieldModel> {
  const dto = await canonicalFieldsAdminService.getById(id)
  return toCanonicalFieldModel(dto)
}
