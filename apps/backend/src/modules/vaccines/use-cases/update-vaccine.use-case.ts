import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { UpdateVaccineDto, VaccineResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { IVaccinesRepository } from '../repositories/vaccines.repository.interface'
import { toVaccineResponse } from '../vaccine.mapper'

@Injectable()
export class UpdateVaccineUseCase extends BaseUseCase {
  private readonly logger = new Logger(UpdateVaccineUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly vaccinesRepository: IVaccinesRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string, dto: UpdateVaccineDto): Promise<VaccineResponseDto> {
    const vaccine = await this.vaccinesRepository.findById(id)
    if (!vaccine) throw new NotFoundException('Vaccine not found')

    if (dto.name && dto.name.toLowerCase() !== vaccine.name.toLowerCase()) {
      const existing = await this.vaccinesRepository.findByName(dto.name)
      if (existing) throw new ConflictException('Vaccine name already in use')
    }

    const updated = await this.vaccinesRepository.update(id, dto)

    try {
      await this.cacheService.del(`vaccine:${id}`)
      await this.cacheService.delByPattern('vaccines:list*')
    } catch {
      this.logger.warn('Cache invalidation failed', { context: UpdateVaccineUseCase.name })
    }

    return toVaccineResponse(updated)
  }
}
