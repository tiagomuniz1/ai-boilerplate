import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { MedicationResponseDto, UpdateMedicationDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { Medication } from '../entities/medication.entity'
import { IMedicationsRepository } from '../repositories/medications.repository.interface'

@Injectable()
export class UpdateMedicationUseCase extends BaseUseCase {
  private readonly logger = new Logger(UpdateMedicationUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly medicationsRepository: IMedicationsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string, dto: UpdateMedicationDto): Promise<MedicationResponseDto> {
    const existing = await this.medicationsRepository.findById(id)
    if (!existing) throw new NotFoundException('Medication not found')

    const medication = await this.medicationsRepository.update(id, dto)

    try {
      await this.cacheService.del(`medication:${id}`)
      await this.cacheService.delByPattern('medications:list*')
    } catch {
      this.logger.warn('Cache invalidation failed', { context: UpdateMedicationUseCase.name })
    }

    return this.toResponse(medication)
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
