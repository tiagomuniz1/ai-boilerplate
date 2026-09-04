import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { IVaccineScheduleRulesRepository } from '../repositories/vaccine-schedule-rules.repository.interface'

@Injectable()
export class DeleteScheduleRuleUseCase extends BaseUseCase {
  private readonly logger = new Logger(DeleteScheduleRuleUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly rulesRepository: IVaccineScheduleRulesRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string): Promise<void> {
    const rule = await this.rulesRepository.findById(id)
    if (!rule) throw new NotFoundException('Schedule rule not found')

    await this.rulesRepository.delete(id)

    try {
      await this.cacheService.delByPattern('vaccine_status:*')
    } catch {
      this.logger.warn('Cache invalidation failed', { context: DeleteScheduleRuleUseCase.name })
    }
  }
}
