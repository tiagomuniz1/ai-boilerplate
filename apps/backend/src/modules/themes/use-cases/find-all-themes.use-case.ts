import { Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { PaginatedThemesResponseDto, ThemeResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { IThemesRepository } from '../repositories/themes.repository.interface'
import { Theme } from '../entities/theme.entity'
import { PaginationDto } from '../../../common/dto/pagination.dto'

@Injectable()
export class FindAllThemesUseCase extends BaseUseCase {
  private readonly logger = new Logger(FindAllThemesUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly themesRepository: IThemesRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(query: PaginationDto): Promise<PaginatedThemesResponseDto> {
    const { page = 1, limit = 20 } = query
    const cacheKey = `themes:list:${page}:${limit}`

    try {
      const cached = await this.cacheService.get<PaginatedThemesResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: FindAllThemesUseCase.name })
    }

    const [themes, total] = await this.themesRepository.findAll(page, limit)
    const result: PaginatedThemesResponseDto = {
      data: themes.map((t) => this.toResponse(t)),
      total,
      page,
      limit,
    }

    try {
      await this.cacheService.set(cacheKey, result, 60)
    } catch {
      this.logger.warn('Cache write failed', { context: FindAllThemesUseCase.name })
    }

    return result
  }

  toResponse(theme: Theme): ThemeResponseDto {
    return {
      id: theme.id,
      name: theme.name,
      slug: theme.slug,
      isDefault: theme.isDefault,
      accentColor: theme.accentColor,
      accentSoftColor: theme.accentSoftColor,
      borderRadius: theme.borderRadius,
      createdAt: theme.createdAt,
      updatedAt: theme.updatedAt,
    }
  }
}
