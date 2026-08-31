import type { CanonicalFieldResponseDto } from '@app/shared'
import type { ICanonicalFieldModel } from '../types/canonical-field-model.types'

export function toCanonicalFieldModel(dto: CanonicalFieldResponseDto): ICanonicalFieldModel {
  return {
    id: dto.id,
    canonicalKey: dto.canonicalKey,
    label: dto.label,
    type: dto.type,
    options: dto.options
      ? dto.options.map((o) => ({ value: o.value, label: o.label }))
      : null,
    unit: dto.unit,
    description: dto.description,
  }
}
