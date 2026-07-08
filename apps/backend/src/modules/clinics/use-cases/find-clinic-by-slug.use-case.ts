import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { ClinicResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { IClinicsRepository } from '../repositories/clinics.repository.interface'
import { ClinicResponseMapper } from '../mappers/clinic-response.mapper'

@Injectable()
export class FindClinicBySlugUseCase extends BaseUseCase {
  private readonly logger = new Logger(FindClinicBySlugUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly clinicsRepository: IClinicsRepository,
    private readonly cacheService: CacheService,
    private readonly clinicResponseMapper: ClinicResponseMapper,
  ) {
    super(dataSource)
  }

  async execute(slug: string): Promise<ClinicResponseDto> {
    const cacheKey = `clinic:slug:${slug}`

    try {
      const cached = await this.cacheService.get<ClinicResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: FindClinicBySlugUseCase.name })
    }

    const clinic = await this.clinicsRepository.findBySlug(slug)
    if (!clinic) throw new NotFoundException('Clinic not found')

    const response = this.clinicResponseMapper.toResponse(clinic)

    try {
      await this.cacheService.set(cacheKey, response, 300)
    } catch {
      this.logger.warn('Cache write failed', { context: FindClinicBySlugUseCase.name })
    }

    return response
  }
}
