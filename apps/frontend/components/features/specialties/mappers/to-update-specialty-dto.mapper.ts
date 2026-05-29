import type { UpdateSpecialtyDto } from '@app/shared'
import type { IUpdateSpecialtyInput } from '../types/specialty-input.types'

export function toUpdateSpecialtyDto(input: IUpdateSpecialtyInput): UpdateSpecialtyDto {
  return {
    name: input.name,
    description: input.description,
  }
}
