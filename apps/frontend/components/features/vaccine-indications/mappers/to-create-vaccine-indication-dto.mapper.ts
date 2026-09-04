import type { CreateVaccineIndicationDto } from '@app/shared'
import type { ICreateVaccineIndicationInput } from '../types/vaccine-indication-input.types'

export function toCreateVaccineIndicationDto(
  input: ICreateVaccineIndicationInput,
): CreateVaccineIndicationDto {
  return {
    appointmentId: input.appointmentId,
    ...(input.registrationId ? { registrationId: input.registrationId } : {}),
    ...(input.specialtyId ? { specialtyId: input.specialtyId } : {}),
    items: input.items.map((item) => ({
      vaccineId: item.vaccineId,
      // Campo vazio não vira string vazia no contrato: o backend valida
      // MaxLength, e "" gravaria dose em branco no documento.
      ...(item.doseLabel?.trim() ? { doseLabel: item.doseLabel.trim() } : {}),
      ...(item.instructions?.trim() ? { instructions: item.instructions.trim() } : {}),
    })),
    ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
  } as CreateVaccineIndicationDto
}
