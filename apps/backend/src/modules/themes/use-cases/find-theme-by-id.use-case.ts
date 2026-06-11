import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { ThemeResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { IThemesRepository } from '../repositories/themes.repository.interface'
import { Theme } from '../entities/theme.entity'

@Injectable()
export class FindThemeByIdUseCase extends BaseUseCase {
  private readonly logger = new Logger(FindThemeByIdUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly themesRepository: IThemesRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string): Promise<ThemeResponseDto> {
    const cacheKey = `theme:${id}`

    try {
      const cached = await this.cacheService.get<ThemeResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: FindThemeByIdUseCase.name })
    }

    const theme = await this.themesRepository.findById(id)
    if (!theme) throw new NotFoundException('Theme not found')

    const response = this.toResponse(theme)

    try {
      await this.cacheService.set(cacheKey, response, 300)
    } catch {
      this.logger.warn('Cache write failed', { context: FindThemeByIdUseCase.name })
    }

    return response
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
      bgColor: theme.bgColor,
      bgDarkColor: theme.bgDarkColor,
      createdAt: theme.createdAt,
      updatedAt: theme.updatedAt,
    }
  }
}
