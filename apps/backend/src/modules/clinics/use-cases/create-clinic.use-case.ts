import { ConflictException, Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { ClinicResponseDto, CreateClinicDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { IClinicsRepository } from '../repositories/clinics.repository.interface'
import { Clinic } from '../entities/clinic.entity'

@Injectable()
export class CreateClinicUseCase extends BaseUseCase {
  private readonly logger = new Logger(CreateClinicUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly clinicsRepository: IClinicsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(dto: CreateClinicDto): Promise<ClinicResponseDto> {
    const slug = dto.slug ?? this.generateSlug(dto.name)

    const existing = await this.clinicsRepository.findBySlug(slug)
    if (existing) throw new ConflictException('Slug already in use')

    const clinic = await this.clinicsRepository.create({ name: dto.name, slug })

    try {
      await this.cacheService.delByPattern('clinics:list*')
    } catch {
      this.logger.warn('Cache invalidation failed', { context: CreateClinicUseCase.name })
    }

    return this.toResponse(clinic)
  }

  private generateSlug(name: string): string {
    return name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }

  private toResponse(clinic: Clinic): ClinicResponseDto {
    return {
      id: clinic.id,
      name: clinic.name,
      slug: clinic.slug,
      isActive: clinic.isActive,
      createdAt: clinic.createdAt,
      updatedAt: clinic.updatedAt,
    }
  }
}
