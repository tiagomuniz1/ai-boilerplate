import { Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { ClinicResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { IStorageAdapter } from '../../../common/adapters/storage.adapter.interface'
import { CacheService } from '../../../cache/cache.service'
import { IClinicsRepository } from '../repositories/clinics.repository.interface'
import { Clinic } from '../entities/clinic.entity'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 2 * 1024 * 1024

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

@Injectable()
export class UploadClinicLogoUseCase extends BaseUseCase {
  private readonly logger = new Logger(UploadClinicLogoUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly clinicsRepository: IClinicsRepository,
    private readonly storageAdapter: IStorageAdapter,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(clinicId: string, file: Express.Multer.File): Promise<ClinicResponseDto> {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new UnprocessableEntityException('Invalid file type. Accepted: jpeg, png, webp')
    }

    if (file.size > MAX_SIZE_BYTES) {
      throw new UnprocessableEntityException('File too large. Maximum size is 2MB')
    }

    const clinic = await this.clinicsRepository.findById(clinicId)
    if (!clinic) throw new NotFoundException('Clinic not found')

    const ext = MIME_TO_EXT[file.mimetype]
    const path = `clinics/${clinicId}/logo.${ext}`
    const logoUrl = await this.storageAdapter.upload(file.buffer, path, file.mimetype, true)

    await this.clinicsRepository.updateLogo(clinicId, logoUrl)

    try {
      await this.cacheService.del(`clinic:${clinicId}`)
      await this.cacheService.delByPattern('clinics:list*')
    } catch {
      this.logger.warn('Cache invalidation failed', { context: UploadClinicLogoUseCase.name })
    }

    return this.toResponse({ ...clinic, logoUrl })
  }

  private toResponse(clinic: Clinic & { logoUrl: string }): ClinicResponseDto {
    return {
      id: clinic.id,
      name: clinic.name,
      slug: clinic.slug,
      isActive: clinic.isActive,
      themeId: clinic.themeId ?? null,
      logoUrl: clinic.logoUrl,
      logoDarkUrl: clinic.logoDarkUrl ?? null,
      faviconUrl: clinic.faviconUrl ?? null,
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
