import type { ClinicResponseDto } from '@app/shared'
import type { IClinicModel } from '../types/clinic.types'

export function toClinicModel(dto: ClinicResponseDto): IClinicModel {
  return {
    id: dto.id,
    name: dto.name,
    slug: dto.slug,
    isActive: dto.isActive,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  }
}
