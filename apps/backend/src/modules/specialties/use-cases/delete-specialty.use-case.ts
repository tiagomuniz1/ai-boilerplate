import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ISpecialtiesRepository } from '../repositories/specialties.repository.interface'

@Injectable()
export class DeleteSpecialtyUseCase extends BaseUseCase {
  private readonly logger = new Logger(DeleteSpecialtyUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly specialtiesRepository: ISpecialtiesRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string): Promise<void> {
    const specialty = await this.specialtiesRepository.findById(id)
    if (!specialty) throw new NotFoundException('Specialty not found')

    await this.specialtiesRepository.delete(id)

    try {
      await this.cacheService.del(`specialty:${id}`)
      await this.cacheService.delByPattern('specialties:list*')
    } catch {
      this.logger.warn('Cache invalidation failed', { context: DeleteSpecialtyUseCase.name })
    }
  }
}
