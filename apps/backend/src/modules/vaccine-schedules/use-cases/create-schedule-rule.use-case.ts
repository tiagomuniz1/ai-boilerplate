import { ConflictException, Injectable, Logger, UnprocessableEntityException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { CreateVaccineScheduleRuleDto, VaccineScheduleRuleResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { IVaccinesRepository } from '../../vaccines/repositories/vaccines.repository.interface'
import { IVaccineScheduleRulesRepository } from '../repositories/vaccine-schedule-rules.repository.interface'
import { toRuleResponse } from '../vaccine-schedule.mapper'

@Injectable()
export class CreateScheduleRuleUseCase extends BaseUseCase {
  private readonly logger = new Logger(CreateScheduleRuleUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly rulesRepository: IVaccineScheduleRulesRepository,
    private readonly vaccinesRepository: IVaccinesRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(dto: CreateVaccineScheduleRuleDto): Promise<VaccineScheduleRuleResponseDto> {
    const vaccine = await this.vaccinesRepository.findById(dto.vaccineId)
    if (!vaccine) throw new UnprocessableEntityException(`Vaccine not found: ${dto.vaccineId}`)

    const existing = await this.rulesRepository.findByVaccineAndOrder(dto.vaccineId, dto.doseOrder)
    if (existing) {
      throw new ConflictException('This vaccine already has a rule for that dose order')
    }

    // Janela invertida tornaria a dose impossível de cumprir e o motor a
    // marcaria como atrasada desde sempre.
    if (dto.maxAgeMonths !== undefined && dto.maxAgeMonths < dto.minAgeMonths) {
      throw new UnprocessableEntityException('maxAgeMonths cannot be lower than minAgeMonths')
    }

    const rule = await this.rulesRepository.create({
      vaccineId: dto.vaccineId,
      doseLabel: dto.doseLabel,
      doseOrder: dto.doseOrder,
      minAgeMonths: dto.minAgeMonths,
      maxAgeMonths: dto.maxAgeMonths ?? null,
      minIntervalDays: dto.minIntervalDays ?? null,
      appliesToGender: dto.appliesToGender ?? null,
      isActive: true,
    })

    try {
      await this.cacheService.delByPattern('vaccine_status:*')
    } catch {
      this.logger.warn('Cache invalidation failed', { context: CreateScheduleRuleUseCase.name })
    }

    return toRuleResponse(rule)
  }
}
