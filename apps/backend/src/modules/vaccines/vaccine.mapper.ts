import { VaccineResponseDto } from '@app/shared'
import { Vaccine } from './entities/vaccine.entity'

/**
 * Fatorado de propósito: em `medications` esta mesma conversão está copiada nos
 * quatro use-cases, e qualquer campo novo precisa ser lembrado quatro vezes.
 */
export function toVaccineResponse(vaccine: Vaccine): VaccineResponseDto {
  return {
    id: vaccine.id,
    name: vaccine.name,
    abbreviation: vaccine.abbreviation,
    preventedDiseases: vaccine.preventedDiseases,
    isActive: vaccine.isActive,
    createdAt: vaccine.createdAt,
  }
}
