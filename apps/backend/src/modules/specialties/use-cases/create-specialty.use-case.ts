import { ConflictException, Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { CreateSpecialtyDto, SpecialtyResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ISpecialtiesRepository } from '../repositories/specialties.repository.interface'
import { Specialty } from '../entities/specialty.entity'

@Injectable()
export class CreateSpecialtyUseCase extends BaseUseCase {
  private readonly logger = new Logger(CreateSpecialtyUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly specialtiesRepository: ISpecialtiesRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(dto: CreateSpecialtyDto): Promise<SpecialtyResponseDto> {
    const existing = await this.specialtiesRepository.findByName(dto.name)
    if (existing) throw new ConflictException('Specialty name already in use')

    const specialty = await this.specialtiesRepository.create(dto)

    try {
      await this.cacheService.delByPattern('specialties:list*')
    } catch {
      this.logger.warn('Cache invalidation failed', { context: CreateSpecialtyUseCase.name })
    }

    return this.toResponse(specialty)
  }

  private toResponse(specialty: Specialty): SpecialtyResponseDto {
    return {
      id: specialty.id,
      name: specialty.name,
      description: specialty.description,
      titleName: specialty.titleName,
      clinicCount: 0,
      createdAt: specialty.createdAt,
      updatedAt: specialty.updatedAt,
    }
  }
}
