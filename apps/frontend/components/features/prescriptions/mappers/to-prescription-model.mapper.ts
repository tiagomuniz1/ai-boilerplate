import type { PrescriptionResponseDto } from '@app/shared'
import type { IPrescriptionModel } from '../types/prescription-model.types'

export function toPrescriptionModel(dto: PrescriptionResponseDto): IPrescriptionModel {
  return {
    id: dto.id,
    appointmentId: dto.appointmentId,
    patientId: dto.patientId,
    patientName: dto.patientName,
    doctorId: dto.doctorId,
    doctorName: dto.doctorName,
    issuedAt: new Date(dto.issuedAt as unknown as string),
    items: dto.items.map((item) => ({
      medicationId: item.medicationId,
      name: item.name,
      activeIngredient: item.activeIngredient,
      instructions: item.instructions,
    })),
    notes: dto.notes,
    createdAt: new Date(dto.createdAt as unknown as string),
  }
}
