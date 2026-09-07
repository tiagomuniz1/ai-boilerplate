import type { VaccineIndicationResponseDto } from '@app/shared'
import type { IVaccineIndicationModel } from '../types/vaccine-indication-model.types'

export function toVaccineIndicationModel(dto: VaccineIndicationResponseDto): IVaccineIndicationModel {
  return {
    id: dto.id,
    appointmentId: dto.appointmentId,
    patientId: dto.patientId,
    patientName: dto.patientName,
    professionalId: dto.professionalId,
    professionalName: dto.professionalName,
    issuedAt: new Date(dto.issuedAt),
    items: dto.items.map((item) => ({
      vaccineId: item.vaccineId,
      name: item.name,
      abbreviation: item.abbreviation,
      doseLabel: item.doseLabel,
      instructions: item.instructions,
    })),
    notes: dto.notes,
    createdAt: new Date(dto.createdAt),
  }
}
