import type { MedicationResponseDto } from '@app/shared'
import type { IMedicationModel } from '../types/medication-model.types'

export function toMedicationModel(dto: MedicationResponseDto): IMedicationModel {
  return {
    id: dto.id,
    name: dto.name,
    activeIngredient: dto.activeIngredient,
    regulatoryCategory: dto.regulatoryCategory,
    therapeuticClass: dto.therapeuticClass,
    holderCompany: dto.holderCompany,
    registrationNumber: dto.registrationNumber,
    registrationStatus: dto.registrationStatus,
    source: dto.source,
    isActive: dto.isActive,
    createdAt: new Date(dto.createdAt),
  }
}
