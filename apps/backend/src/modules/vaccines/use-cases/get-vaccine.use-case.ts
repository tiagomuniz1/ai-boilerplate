import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { VaccineResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { IVaccinesRepository } from '../repositories/vaccines.repository.interface'
import { toVaccineResponse } from '../vaccine.mapper'

@Injectable()
export class GetVaccineUseCase extends BaseUseCase {
  private readonly logger = new Logger(GetVaccineUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly vaccinesRepository: IVaccinesRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string): Promise<VaccineResponseDto> {
    const cacheKey = `vaccine:${id}`

    try {
      const cached = await this.cacheService.get<VaccineResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: GetVaccineUseCase.name })
    }

    const vaccine = await this.vaccinesRepository.findById(id)
    if (!vaccine) throw new NotFoundException('Vaccine not found')

    const result = toVaccineResponse(vaccine)

    try {
      await this.cacheService.set(cacheKey, result, 600)
    } catch {
      this.logger.warn('Cache write failed', { context: GetVaccineUseCase.name })
    }

    return result
  }
}
