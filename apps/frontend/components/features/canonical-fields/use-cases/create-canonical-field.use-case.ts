import { canonicalFieldsAdminService } from '../services/canonical-fields-admin.service'
import { toCanonicalFieldModel } from '../mappers/to-canonical-field-model.mapper'
import { toCreateCanonicalFieldDto } from '../mappers/to-create-canonical-field-dto.mapper'
import type { ICanonicalFieldModel } from '../types/canonical-field-model.types'
import type { ICreateCanonicalFieldInput } from '../types/canonical-field-input.types'

export async function createCanonicalFieldUseCase(
  input: ICreateCanonicalFieldInput,
): Promise<ICanonicalFieldModel> {
  const dto = await canonicalFieldsAdminService.create(toCreateCanonicalFieldDto(input))
  return toCanonicalFieldModel(dto)
}
