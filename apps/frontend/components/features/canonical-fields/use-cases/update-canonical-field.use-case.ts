import { canonicalFieldsAdminService } from '../services/canonical-fields-admin.service'
import { toCanonicalFieldModel } from '../mappers/to-canonical-field-model.mapper'
import { toUpdateCanonicalFieldDto } from '../mappers/to-update-canonical-field-dto.mapper'
import type { ICanonicalFieldModel } from '../types/canonical-field-model.types'
import type { IUpdateCanonicalFieldInput } from '../types/canonical-field-input.types'

export async function updateCanonicalFieldUseCase(
  id: string,
  input: IUpdateCanonicalFieldInput,
): Promise<ICanonicalFieldModel> {
  const dto = await canonicalFieldsAdminService.update(id, toUpdateCanonicalFieldDto(input))
  return toCanonicalFieldModel(dto)
}
