import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { DataSource } from 'typeorm'
import { UpdateVaccineScheduleRuleDto, VaccineScheduleRuleResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { IVaccineScheduleRulesRepository } from '../repositories/vaccine-schedule-rules.repository.interface'
import { toRuleResponse } from '../vaccine-schedule.mapper'

@Injectable()
export class UpdateScheduleRuleUseCase extends BaseUseCase {
  private readonly logger = new Logger(UpdateScheduleRuleUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly rulesRepository: IVaccineScheduleRulesRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string, dto: UpdateVaccineScheduleRuleDto): Promise<VaccineScheduleRuleResponseDto> {
    const rule = await this.rulesRepository.findById(id)
    if (!rule) throw new NotFoundException('Schedule rule not found')

    if (dto.doseOrder !== undefined && dto.doseOrder !== rule.doseOrder) {
      const existing = await this.rulesRepository.findByVaccineAndOrder(rule.vaccineId, dto.doseOrder)
      if (existing) throw new ConflictException('This vaccine already has a rule for that dose order')
    }

    const minAge = dto.minAgeMonths ?? rule.minAgeMonths
    const maxAge = dto.maxAgeMonths !== undefined ? dto.maxAgeMonths : rule.maxAgeMonths
    if (maxAge !== null && maxAge < minAge) {
      throw new UnprocessableEntityException('maxAgeMonths cannot be lower than minAgeMonths')
    }

    const updated = await this.rulesRepository.update(id, dto)

    try {
      await this.cacheService.delByPattern('vaccine_status:*')
    } catch {
      this.logger.warn('Cache invalidation failed', { context: UpdateScheduleRuleUseCase.name })
    }

    return toRuleResponse(updated)
  }
}
