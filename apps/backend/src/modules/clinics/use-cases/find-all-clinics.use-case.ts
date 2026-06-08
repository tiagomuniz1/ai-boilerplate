import { Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { ClinicResponseDto, PaginatedClinicsResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { IClinicsRepository } from '../repositories/clinics.repository.interface'
import { ListClinicsQueryDto } from '../dto/list-clinics-query.dto'
import { Clinic } from '../entities/clinic.entity'

@Injectable()
export class FindAllClinicsUseCase extends BaseUseCase {
  private readonly logger = new Logger(FindAllClinicsUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly clinicsRepository: IClinicsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(query: ListClinicsQueryDto): Promise<PaginatedClinicsResponseDto> {
    const { page = 1, limit = 20, search } = query
    const cacheKey = `clinics:list:${page}:${limit}:${search ?? 'all'}`

    try {
      const cached = await this.cacheService.get<PaginatedClinicsResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: FindAllClinicsUseCase.name })
    }

    const [clinics, total] = await this.clinicsRepository.findAll(page, limit, search)
    const result: PaginatedClinicsResponseDto = {
      data: clinics.map((c) => this.toResponse(c)),
      total,
      page,
      limit,
    }

    try {
      await this.cacheService.set(cacheKey, result, 60)
    } catch {
      this.logger.warn('Cache write failed', { context: FindAllClinicsUseCase.name })
    }

    return result
  }

  private toResponse(clinic: Clinic): ClinicResponseDto {
    return {
      id: clinic.id,
      name: clinic.name,
      slug: clinic.slug,
      isActive: clinic.isActive,
      createdAt: clinic.createdAt,
      updatedAt: clinic.updatedAt,
    }
  }
}
