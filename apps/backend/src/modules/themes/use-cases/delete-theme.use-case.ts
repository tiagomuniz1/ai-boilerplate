import { ConflictException, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { IThemesRepository } from '../repositories/themes.repository.interface'

@Injectable()
export class DeleteThemeUseCase extends BaseUseCase {
  private readonly logger = new Logger(DeleteThemeUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly themesRepository: IThemesRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string): Promise<void> {
    const theme = await this.themesRepository.findById(id)
    if (!theme) throw new NotFoundException('Theme not found')

    if (theme.isDefault) {
      throw new UnprocessableEntityException('Cannot delete the default theme. Set another theme as default first.')
    }

    const clinicsCount = await this.themesRepository.countClinicsByThemeId(id)
    if (clinicsCount > 0) {
      throw new ConflictException(`Theme is assigned to ${clinicsCount} clinic(s). Reassign them before deleting.`)
    }

    await this.themesRepository.delete(id)

    try {
      await this.cacheService.del(`theme:${id}`)
      await this.cacheService.delByPattern('themes:list*')
    } catch {
      this.logger.warn('Cache invalidation failed', { context: DeleteThemeUseCase.name })
    }
  }
}
