import { Injectable } from '@nestjs/common'
import { ClinicResponseDto } from '@app/shared'
import { ClinicAssetUrlService } from '../../../common/services/clinic-asset-url.service'
import { Clinic } from '../entities/clinic.entity'

@Injectable()
export class ClinicResponseMapper {
  constructor(private readonly assetUrlService: ClinicAssetUrlService) {}

  toResponse(clinic: Clinic): ClinicResponseDto {
    return {
      id: clinic.id,
      name: clinic.name,
      slug: clinic.slug,
      isActive: clinic.isActive,
      themeId: clinic.themeId ?? null,
      logoUrl: clinic.logoPath ? this.assetUrlService.build(clinic.slug, 'logo', clinic.updatedAt) : null,
      logoDarkUrl: clinic.logoDarkPath
        ? this.assetUrlService.build(clinic.slug, 'logo-dark', clinic.updatedAt)
        : null,
      faviconUrl: clinic.faviconPath
        ? this.assetUrlService.build(clinic.slug, 'favicon', clinic.updatedAt)
        : null,
      address: clinic.addressStreet != null
        ? {
            street: clinic.addressStreet,
            number: clinic.addressNumber!,
            complement: clinic.addressComplement,
            neighborhood: clinic.addressNeighborhood!,
            city: clinic.addressCity!,
            state: clinic.addressState!,
            zipCode: clinic.addressZipCode!,
            country: clinic.addressCountry!,
          }
        : null,
      createdAt: clinic.createdAt,
      updatedAt: clinic.updatedAt,
    }
  }
}
