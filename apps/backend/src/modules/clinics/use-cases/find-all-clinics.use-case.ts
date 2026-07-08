import { Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { PaginatedClinicsResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { IClinicsRepository } from '../repositories/clinics.repository.interface'
import { ListClinicsQueryDto } from '../dto/list-clinics-query.dto'
import { ClinicResponseMapper } from '../mappers/clinic-response.mapper'

@Injectable()
export class FindAllClinicsUseCase extends BaseUseCase {
  private readonly logger = new Logger(FindAllClinicsUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly clinicsRepository: IClinicsRepository,
    private readonly cacheService: CacheService,
    private readonly clinicResponseMapper: ClinicResponseMapper,
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
      data: clinics.map((c) => this.clinicResponseMapper.toResponse(c)),
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
}
