import { Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { PaginatedSpecialtiesResponseDto, SpecialtyResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ISpecialtiesRepository } from '../repositories/specialties.repository.interface'
import { SpecialtyListQueryDto } from '../dto/specialty-list-query.dto'
import { Specialty } from '../entities/specialty.entity'

@Injectable()
export class FindAllSpecialtiesUseCase extends BaseUseCase {
  private readonly logger = new Logger(FindAllSpecialtiesUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly specialtiesRepository: ISpecialtiesRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(query: SpecialtyListQueryDto): Promise<PaginatedSpecialtiesResponseDto> {
    const { page = 1, limit = 20, search } = query
    const cacheKey = `specialties:list:${page}:${limit}:${search ?? ''}`

    try {
      const cached = await this.cacheService.get<PaginatedSpecialtiesResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: FindAllSpecialtiesUseCase.name })
    }

    const [specialties, total] = await this.specialtiesRepository.findAll(page, limit, search)
    const result: PaginatedSpecialtiesResponseDto = {
      data: specialties.map((s) => this.toResponse(s)),
      total,
      page,
      limit,
    }

    try {
      await this.cacheService.set(cacheKey, result, 60)
    } catch {
      this.logger.warn('Cache write failed', { context: FindAllSpecialtiesUseCase.name })
    }

    return result
  }

  private toResponse(specialty: Specialty): SpecialtyResponseDto {
    return {
      id: specialty.id,
      name: specialty.name,
      description: specialty.description,
      createdAt: specialty.createdAt,
      updatedAt: specialty.updatedAt,
    }
  }
}
