import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { ThemeResponseDto, UpdateThemeDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { IThemesRepository } from '../repositories/themes.repository.interface'
import { Theme } from '../entities/theme.entity'

@Injectable()
export class UpdateThemeUseCase extends BaseUseCase {
  private readonly logger = new Logger(UpdateThemeUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly themesRepository: IThemesRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string, dto: UpdateThemeDto): Promise<ThemeResponseDto> {
    const existing = await this.themesRepository.findById(id)
    if (!existing) throw new NotFoundException('Theme not found')

    let theme: Theme

    if (dto.isDefault) {
      theme = await this.runInTransaction(async (queryRunner) => {
        await this.themesRepository.clearDefaultExcept(id, queryRunner)
        return this.themesRepository.update(id, dto, queryRunner)
      })
    } else {
      theme = await this.themesRepository.update(id, dto)
    }

    try {
      await this.cacheService.del(`theme:${id}`)
      await this.cacheService.delByPattern('themes:list*')
      await this.cacheService.delByPattern('theme:clinic:*')
    } catch {
      this.logger.warn('Cache invalidation failed', { context: UpdateThemeUseCase.name })
    }

    return this.toResponse(theme)
  }

  private toResponse(theme: Theme): ThemeResponseDto {
    return {
      id: theme.id,
      name: theme.name,
      slug: theme.slug,
      isDefault: theme.isDefault,
      accentColor: theme.accentColor,
      accentSoftColor: theme.accentSoftColor,
      createdAt: theme.createdAt,
      updatedAt: theme.updatedAt,
    }
  }
}
