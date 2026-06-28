import { Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { MedicationResponseDto, PaginatedMedicationsResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { MedicationListQueryDto } from '../dto/medication-list-query.dto'
import { Medication } from '../entities/medication.entity'
import { IMedicationsRepository } from '../repositories/medications.repository.interface'

@Injectable()
export class FindMedicationsUseCase extends BaseUseCase {
  private readonly logger = new Logger(FindMedicationsUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly medicationsRepository: IMedicationsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(
    query: MedicationListQueryDto,
    currentUser: ICurrentUser,
  ): Promise<PaginatedMedicationsResponseDto> {
    const { page, limit, search } = query
    const includeInactive =
      query.includeInactive === true && currentUser.role === UserRole.PLATFORM_ADMIN
    const cacheKey = `medications:list:${page}:${limit}:${search?.trim() || 'all'}:${includeInactive}`

    try {
      const cached = await this.cacheService.get<PaginatedMedicationsResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: FindMedicationsUseCase.name })
    }

    const [medications, total] = await this.medicationsRepository.findAll(
      page,
      limit,
      search,
      includeInactive,
    )

    const result: PaginatedMedicationsResponseDto = {
      data: medications.map((medication) => this.toResponse(medication)),
      total,
      page,
      limit,
    }

    try {
      await this.cacheService.set(cacheKey, result, 60)
    } catch {
      this.logger.warn('Cache write failed', { context: FindMedicationsUseCase.name })
    }

    return result
  }

  private toResponse(medication: Medication): MedicationResponseDto {
    return {
      id: medication.id,
      name: medication.name,
      activeIngredient: medication.activeIngredient,
      regulatoryCategory: medication.regulatoryCategory,
      therapeuticClass: medication.therapeuticClass,
      holderCompany: medication.holderCompany,
      registrationNumber: medication.registrationNumber,
      registrationStatus: medication.registrationStatus,
      source: medication.source,
      isActive: medication.isActive,
      createdAt: medication.createdAt,
    }
  }
}
