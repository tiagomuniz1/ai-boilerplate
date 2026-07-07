import type { SpecialtyResponseDto } from '@app/shared'
import type { ISpecialtyModel } from '../types/specialty-model.types'

export function toSpecialtyModel(dto: SpecialtyResponseDto): ISpecialtyModel {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description,
    titleName: dto.titleName,
    clinicCount: dto.clinicCount,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  }
}
