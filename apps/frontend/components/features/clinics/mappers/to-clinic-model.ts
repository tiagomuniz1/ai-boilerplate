import type { ClinicResponseDto } from '@app/shared'
import type { IClinicModel } from '../types/clinic.types'

export function toClinicModel(dto: ClinicResponseDto): IClinicModel {
  return {
    id: dto.id,
    name: dto.name,
    slug: dto.slug,
    isActive: dto.isActive,
    themeId: dto.themeId ?? null,
    address: dto.address
      ? {
          street: dto.address.street,
          number: dto.address.number,
          complement: dto.address.complement,
          neighborhood: dto.address.neighborhood,
          city: dto.address.city,
          state: dto.address.state,
          zipCode: dto.address.zipCode,
          country: dto.address.country,
        }
      : null,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  }
}
