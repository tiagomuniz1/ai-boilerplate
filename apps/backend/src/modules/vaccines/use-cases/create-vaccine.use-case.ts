import { ConflictException, Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { CreateVaccineDto, VaccineResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { IVaccinesRepository } from '../repositories/vaccines.repository.interface'
import { toVaccineResponse } from '../vaccine.mapper'

@Injectable()
export class CreateVaccineUseCase extends BaseUseCase {
  private readonly logger = new Logger(CreateVaccineUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly vaccinesRepository: IVaccinesRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(dto: CreateVaccineDto): Promise<VaccineResponseDto> {
    // O índice único cobre a corrida; esta checagem existe para devolver 409
    // com mensagem em vez de erro de driver.
    const existing = await this.vaccinesRepository.findByName(dto.name)
    if (existing) throw new ConflictException('Vaccine name already in use')

    const vaccine = await this.vaccinesRepository.create({
      name: dto.name,
      abbreviation: dto.abbreviation ?? null,
      preventedDiseases: dto.preventedDiseases ?? null,
      isActive: true,
    })

    try {
      await this.cacheService.delByPattern('vaccines:list*')
    } catch {
      this.logger.warn('Cache invalidation failed', { context: CreateVaccineUseCase.name })
    }

    return toVaccineResponse(vaccine)
  }
}
