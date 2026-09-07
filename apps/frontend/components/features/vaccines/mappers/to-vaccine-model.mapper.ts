import type { VaccineResponseDto } from '@app/shared'
import type { IVaccineModel } from '../types/vaccine-model.types'

export function toVaccineModel(dto: VaccineResponseDto): IVaccineModel {
  return {
    id: dto.id,
    name: dto.name,
    abbreviation: dto.abbreviation,
    preventedDiseases: dto.preventedDiseases,
    isActive: dto.isActive,
    createdAt: new Date(dto.createdAt),
  }
}
