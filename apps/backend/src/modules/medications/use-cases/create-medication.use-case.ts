import { Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { CreateMedicationDto, MedicationResponseDto, MedicationSource } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { Medication } from '../entities/medication.entity'
import { IMedicationsRepository } from '../repositories/medications.repository.interface'

@Injectable()
export class CreateMedicationUseCase extends BaseUseCase {
  private readonly logger = new Logger(CreateMedicationUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly medicationsRepository: IMedicationsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(dto: CreateMedicationDto): Promise<MedicationResponseDto> {
    const medication = await this.medicationsRepository.create({
      name: dto.name,
      activeIngredient: dto.activeIngredient ?? null,
      regulatoryCategory: dto.regulatoryCategory ?? null,
      therapeuticClass: dto.therapeuticClass ?? null,
      holderCompany: dto.holderCompany ?? null,
      registrationNumber: dto.registrationNumber ?? null,
      registrationStatus: dto.registrationStatus ?? null,
      source: MedicationSource.MANUAL,
      importHash: null,
      isActive: true,
    })

    try {
      await this.cacheService.delByPattern('medications:list*')
    } catch {
      this.logger.warn('Cache invalidation failed', { context: CreateMedicationUseCase.name })
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
