import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { VaccineScheduleRuleResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { IVaccineScheduleRulesRepository } from '../repositories/vaccine-schedule-rules.repository.interface'
import { toRuleResponse } from '../vaccine-schedule.mapper'

@Injectable()
export class FindScheduleRulesUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly rulesRepository: IVaccineScheduleRulesRepository,
  ) {
    super(dataSource)
  }

  async execute(vaccineId?: string): Promise<VaccineScheduleRuleResponseDto[]> {
    const rules = await this.rulesRepository.findAll(vaccineId)
    return rules.map(toRuleResponse)
  }
}
