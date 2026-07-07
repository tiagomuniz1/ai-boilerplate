import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { SpecialtyResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ISpecialtiesRepository } from '../repositories/specialties.repository.interface'
import { Specialty } from '../entities/specialty.entity'

@Injectable()
export class FindSpecialtyByIdUseCase extends BaseUseCase {
  private readonly logger = new Logger(FindSpecialtyByIdUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly specialtiesRepository: ISpecialtiesRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string): Promise<SpecialtyResponseDto> {
    const cacheKey = `specialty:${id}`

    try {
      const cached = await this.cacheService.get<SpecialtyResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: FindSpecialtyByIdUseCase.name })
    }

    const specialty = await this.specialtiesRepository.findById(id)
    if (!specialty) throw new NotFoundException('Specialty not found')

    const clinicCount = await this.specialtiesRepository.countLinkedClinics(id)
    const response = this.toResponse(specialty, clinicCount)

    try {
      await this.cacheService.set(cacheKey, response, 300)
    } catch {
      this.logger.warn('Cache write failed', { context: FindSpecialtyByIdUseCase.name })
    }

    return response
  }

  private toResponse(specialty: Specialty, clinicCount: number): SpecialtyResponseDto {
    return {
      id: specialty.id,
      name: specialty.name,
      description: specialty.description,
      titleName: specialty.titleName,
      clinicCount,
      createdAt: specialty.createdAt,
      updatedAt: specialty.updatedAt,
    }
  }
}
