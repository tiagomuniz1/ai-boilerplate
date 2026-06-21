import { canonicalFieldsService } from '../services/canonical-fields.service'
import { toCanonicalFieldModel } from '../mappers/to-canonical-field-model.mapper'
import type { ICanonicalFieldModel } from '../types/canonical-field-model.types'

export async function listCanonicalFieldsUseCase(specialtyId?: string): Promise<ICanonicalFieldModel[]> {
  const dtos = await canonicalFieldsService.getAll(specialtyId)
  return dtos.map((dto) => toCanonicalFieldModel(dto))
}
