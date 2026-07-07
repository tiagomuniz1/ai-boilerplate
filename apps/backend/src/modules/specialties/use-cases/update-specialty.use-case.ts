import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource, OptimisticLockVersionMismatchError } from 'typeorm'
import { SpecialtyResponseDto, UpdateSpecialtyDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ISpecialtiesRepository } from '../repositories/specialties.repository.interface'
import { Specialty } from '../entities/specialty.entity'

@Injectable()
export class UpdateSpecialtyUseCase extends BaseUseCase {
  private readonly logger = new Logger(UpdateSpecialtyUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly specialtiesRepository: ISpecialtiesRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string, dto: UpdateSpecialtyDto): Promise<SpecialtyResponseDto> {
    const specialty = await this.specialtiesRepository.findById(id)
    if (!specialty) throw new NotFoundException('Specialty not found')

    if (dto.name !== undefined && dto.name.toLowerCase() !== specialty.name.toLowerCase()) {
      const existing = await this.specialtiesRepository.findByName(dto.name)
      if (existing) throw new ConflictException('Specialty name already in use')
    }

    let updated: Specialty
    try {
      updated = await this.specialtiesRepository.update(id, dto)
    } catch (error) {
      if (error instanceof OptimisticLockVersionMismatchError) {
        throw new ConflictException('Record was modified by another process. Please try again.')
      }
      throw error
    }

    try {
      await this.cacheService.del(`specialty:${id}`)
      await this.cacheService.delByPattern('specialties:list*')
    } catch {
      this.logger.warn('Cache invalidation failed', { context: UpdateSpecialtyUseCase.name })
    }

    const clinicCount = await this.specialtiesRepository.countLinkedClinics(id)
    return this.toResponse(updated, clinicCount)
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
