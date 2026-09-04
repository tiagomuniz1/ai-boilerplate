import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { IVaccinesRepository } from '../repositories/vaccines.repository.interface'

@Injectable()
export class DeleteVaccineUseCase extends BaseUseCase {
  private readonly logger = new Logger(DeleteVaccineUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly vaccinesRepository: IVaccinesRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string): Promise<void> {
    const vaccine = await this.vaccinesRepository.findById(id)
    if (!vaccine) throw new NotFoundException('Vaccine not found')

    await this.vaccinesRepository.delete(id)

    try {
      await this.cacheService.del(`vaccine:${id}`)
      await this.cacheService.delByPattern('vaccines:list*')
    } catch {
      this.logger.warn('Cache invalidation failed', { context: DeleteVaccineUseCase.name })
    }
  }
}
