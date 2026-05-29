import type { CreateSpecialtyDto } from '@app/shared'
import type { ICreateSpecialtyInput } from '../types/specialty-input.types'

export function toCreateSpecialtyDto(input: ICreateSpecialtyInput): CreateSpecialtyDto {
  return {
    name: input.name,
    description: input.description,
  }
}
