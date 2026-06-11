import { ConflictException, Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { CreateThemeDto, ThemeResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { IThemesRepository } from '../repositories/themes.repository.interface'
import { Theme } from '../entities/theme.entity'

@Injectable()
export class CreateThemeUseCase extends BaseUseCase {
  private readonly logger = new Logger(CreateThemeUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly themesRepository: IThemesRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(dto: CreateThemeDto): Promise<ThemeResponseDto> {
    const slug = dto.slug ?? this.generateSlug(dto.name)

    const existing = await this.themesRepository.findBySlug(slug)
    if (existing) throw new ConflictException('Slug already in use')

    let theme: Theme

    const themeData = {
      name: dto.name,
      slug,
      accentColor: dto.accentColor,
      accentSoftColor: dto.accentSoftColor,
      borderRadius: dto.borderRadius,
      bgColor: dto.bgColor ?? null,
      bgDarkColor: dto.bgDarkColor ?? null,
    }

    if (dto.isDefault) {
      theme = await this.runInTransaction(async (queryRunner) => {
        await this.themesRepository.clearDefaultExcept('00000000-0000-0000-0000-000000000000', queryRunner)
        return this.themesRepository.create({ ...themeData, isDefault: true }, queryRunner)
      })
    } else {
      theme = await this.themesRepository.create({ ...themeData, isDefault: false })
    }

    try {
      await this.cacheService.delByPattern('themes:list*')
    } catch {
      this.logger.warn('Cache invalidation failed', { context: CreateThemeUseCase.name })
    }

    return this.toResponse(theme)
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
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
      bgColor: theme.bgColor,
      bgDarkColor: theme.bgDarkColor,
      createdAt: theme.createdAt,
      updatedAt: theme.updatedAt,
    }
  }
}
