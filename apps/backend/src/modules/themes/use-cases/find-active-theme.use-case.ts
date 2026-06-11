import { Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { ThemeResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { IThemesRepository } from '../repositories/themes.repository.interface'
import { Theme } from '../entities/theme.entity'

@Injectable()
export class FindActiveThemeUseCase extends BaseUseCase {
  private readonly logger = new Logger(FindActiveThemeUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly themesRepository: IThemesRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(clinicId: string | null): Promise<ThemeResponseDto | null> {
    if (!clinicId) return null

    const cacheKey = `theme:clinic:${clinicId}`

    try {
      const cached = await this.cacheService.get<ThemeResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: FindActiveThemeUseCase.name })
    }

    const theme = (await this.themesRepository.findByClinicId(clinicId))
      ?? (await this.themesRepository.findDefault())

    if (!theme) return null

    const response = this.toResponse(theme)

    try {
      await this.cacheService.set(cacheKey, response, 300)
    } catch {
      this.logger.warn('Cache write failed', { context: FindActiveThemeUseCase.name })
    }

    return response
  }

  private toResponse(theme: Theme): ThemeResponseDto {
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
