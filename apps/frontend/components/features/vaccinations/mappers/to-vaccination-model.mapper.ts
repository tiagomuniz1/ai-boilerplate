import type { VaccinationResponseDto } from '@app/shared'
import type { IVaccinationModel } from '../types/vaccination-model.types'

export function toVaccinationModel(dto: VaccinationResponseDto): IVaccinationModel {
  return {
    ...dto,
    // `appliedAt` fica como string ISO de propósito: é uma data civil, sem
    // hora, e converter para Date reintroduziria fuso — a dose de 12/04 viraria
    // 11/04 à noite em UTC-3.
    createdAt: new Date(dto.createdAt),
  }
}
