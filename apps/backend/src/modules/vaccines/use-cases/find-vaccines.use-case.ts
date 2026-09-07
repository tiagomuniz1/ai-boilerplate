import { Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { PaginatedVaccinesResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { VaccineListQueryDto } from '../dto/vaccine-list-query.dto'
import { IVaccinesRepository } from '../repositories/vaccines.repository.interface'
import { toVaccineResponse } from '../vaccine.mapper'

@Injectable()
export class FindVaccinesUseCase extends BaseUseCase {
  private readonly logger = new Logger(FindVaccinesUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly vaccinesRepository: IVaccinesRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(
    query: VaccineListQueryDto,
    currentUser: ICurrentUser,
  ): Promise<PaginatedVaccinesResponseDto> {
    const { page, limit, search } = query
    // Inativa é decisão de curadoria: some das listas de leitura, e só quem
    // cura o catálogo enxerga. Mesma regra de `medications`.
    const includeInactive =
      query.includeInactive === true && currentUser.role === UserRole.PLATFORM_ADMIN
    const cacheKey = `vaccines:list:${page}:${limit}:${search?.trim() || 'all'}:${includeInactive}`

    try {
      const cached = await this.cacheService.get<PaginatedVaccinesResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: FindVaccinesUseCase.name })
    }

    const [vaccines, total] = await this.vaccinesRepository.findAll(
      page,
      limit,
      search,
      includeInactive,
    )

    const result: PaginatedVaccinesResponseDto = {
      data: vaccines.map(toVaccineResponse),
      total,
      page,
      limit,
    }

    try {
      // Catálogo curado à mão muda raramente — 10 min, como campos canônicos,
      // e não os 60s de medicamentos.
      await this.cacheService.set(cacheKey, result, 600)
    } catch {
      this.logger.warn('Cache write failed', { context: FindVaccinesUseCase.name })
    }

    return result
  }
}
