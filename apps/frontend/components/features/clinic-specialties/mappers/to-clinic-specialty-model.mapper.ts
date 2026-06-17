import type { ClinicSpecialtyResponseDto } from '@app/shared'
import type { IClinicSpecialtyModel } from '../types/clinic-specialty.types'

export function toClinicSpecialtyModel(dto: ClinicSpecialtyResponseDto): IClinicSpecialtyModel {
  return {
    id: dto.id,
    clinicId: dto.clinicId,
    specialtyId: dto.specialtyId,
    name: dto.name,
    description: dto.description,
    linkedAt: new Date(dto.linkedAt),
  }
}
