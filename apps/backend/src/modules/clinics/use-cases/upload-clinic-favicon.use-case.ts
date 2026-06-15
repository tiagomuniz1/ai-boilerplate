import { Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { ClinicResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { IStorageAdapter } from '../../../common/adapters/storage.adapter.interface'
import { CacheService } from '../../../cache/cache.service'
import { IClinicsRepository } from '../repositories/clinics.repository.interface'
import { Clinic } from '../entities/clinic.entity'

const ALLOWED_MIME_TYPES = ['image/x-icon', 'image/png', 'image/svg+xml']
const MAX_SIZE_BYTES = 512 * 1024

const MIME_TO_EXT: Record<string, string> = {
  'image/x-icon': 'ico',
  'image/png': 'png',
  'image/svg+xml': 'svg',
}

@Injectable()
export class UploadClinicFaviconUseCase extends BaseUseCase {
  private readonly logger = new Logger(UploadClinicFaviconUseCase.name)

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
      throw new UnprocessableEntityException('Invalid file type. Accepted: ico, png, svg')
    }

    if (file.size > MAX_SIZE_BYTES) {
      throw new UnprocessableEntityException('File too large. Maximum size is 512KB')
    }

    const clinic = await this.clinicsRepository.findById(clinicId)
    if (!clinic) throw new NotFoundException('Clinic not found')

    const ext = MIME_TO_EXT[file.mimetype]
    const path = `clinics/${clinicId}/favicon.${ext}`
    const faviconUrl = await this.storageAdapter.upload(file.buffer, path, file.mimetype)

    await this.clinicsRepository.updateFavicon(clinicId, faviconUrl)

    try {
      await this.cacheService.del(`clinic:${clinicId}`)
      await this.cacheService.delByPattern('clinics:list*')
    } catch {
      this.logger.warn('Cache invalidation failed', { context: UploadClinicFaviconUseCase.name })
    }

    return this.toResponse({ ...clinic, faviconUrl })
  }

  private toResponse(clinic: Clinic & { faviconUrl: string }): ClinicResponseDto {
    return {
      id: clinic.id,
      name: clinic.name,
      slug: clinic.slug,
      isActive: clinic.isActive,
      themeId: clinic.themeId ?? null,
      logoUrl: clinic.logoUrl ?? null,
      faviconUrl: clinic.faviconUrl,
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
