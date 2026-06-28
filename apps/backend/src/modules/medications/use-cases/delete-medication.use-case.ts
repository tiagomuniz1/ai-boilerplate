import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { IMedicationsRepository } from '../repositories/medications.repository.interface'

@Injectable()
export class DeleteMedicationUseCase extends BaseUseCase {
  private readonly logger = new Logger(DeleteMedicationUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly medicationsRepository: IMedicationsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string): Promise<void> {
    const existing = await this.medicationsRepository.findById(id)
    if (!existing) throw new NotFoundException('Medication not found')

    await this.medicationsRepository.delete(id)

    try {
      await this.cacheService.del(`medication:${id}`)
      await this.cacheService.delByPattern('medications:list*')
    } catch {
      this.logger.warn('Cache invalidation failed', { context: DeleteMedicationUseCase.name })
    }
  }
}
