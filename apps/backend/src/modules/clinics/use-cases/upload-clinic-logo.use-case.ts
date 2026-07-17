import { Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { ClinicResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { IStorageAdapter } from '../../../common/adapters/storage.adapter.interface'
import { CacheService } from '../../../cache/cache.service'
import { IClinicsRepository } from '../repositories/clinics.repository.interface'
import { ClinicResponseMapper } from '../mappers/clinic-response.mapper'

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
    private readonly clinicResponseMapper: ClinicResponseMapper,
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
    const logoPath = await this.storageAdapter.upload(file.buffer, path, file.mimetype)

    await this.clinicsRepository.updateLogo(clinicId, logoPath)

    try {
      await this.cacheService.del(`clinic:${clinicId}`)
      await this.cacheService.del(`clinic:slug:${clinic.slug}`)
      await this.cacheService.delByPattern('clinics:list*')
    } catch {
      this.logger.warn('Cache invalidation failed', { context: UploadClinicLogoUseCase.name })
    }

    // Fresh updatedAt so the returned URL's cache-buster (?v=) reflects this upload.
    return this.clinicResponseMapper.toResponse({ ...clinic, logoPath, updatedAt: new Date() })
  }
}
