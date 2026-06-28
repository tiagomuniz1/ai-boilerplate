import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { MedicationResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { Medication } from '../entities/medication.entity'
import { IMedicationsRepository } from '../repositories/medications.repository.interface'

@Injectable()
export class GetMedicationUseCase extends BaseUseCase {
  private readonly logger = new Logger(GetMedicationUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly medicationsRepository: IMedicationsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string): Promise<MedicationResponseDto> {
    const cacheKey = `medication:${id}`

    try {
      const cached = await this.cacheService.get<MedicationResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: GetMedicationUseCase.name })
    }

    const medication = await this.medicationsRepository.findById(id)
    if (!medication) throw new NotFoundException('Medication not found')

    const result = this.toResponse(medication)

    try {
      await this.cacheService.set(cacheKey, result, 300)
    } catch {
      this.logger.warn('Cache write failed', { context: GetMedicationUseCase.name })
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
