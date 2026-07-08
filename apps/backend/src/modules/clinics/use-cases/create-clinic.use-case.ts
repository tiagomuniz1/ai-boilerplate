import { ConflictException, Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { ClinicResponseDto, CreateClinicDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { IClinicsRepository } from '../repositories/clinics.repository.interface'
import { ClinicResponseMapper } from '../mappers/clinic-response.mapper'

@Injectable()
export class CreateClinicUseCase extends BaseUseCase {
  private readonly logger = new Logger(CreateClinicUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly clinicsRepository: IClinicsRepository,
    private readonly cacheService: CacheService,
    private readonly clinicResponseMapper: ClinicResponseMapper,
  ) {
    super(dataSource)
  }

  async execute(dto: CreateClinicDto): Promise<ClinicResponseDto> {
    const slug = dto.slug ?? this.generateSlug(dto.name)


    const RESERVED_SLUGS = ['backoffice']
    if (RESERVED_SLUGS.includes(slug)) throw new ConflictException('Slug is reserved and cannot be used')
    const existing = await this.clinicsRepository.findBySlug(slug)
    if (existing) throw new ConflictException('Slug already in use')

    const clinic = await this.clinicsRepository.create({
      name: dto.name,
      slug,
      themeId: dto.themeId ?? null,
      address: dto.address,
    })

    try {
      await this.cacheService.delByPattern('clinics:list*')
    } catch {
      this.logger.warn('Cache invalidation failed', { context: CreateClinicUseCase.name })
    }

    return this.clinicResponseMapper.toResponse(clinic)
  }

  private generateSlug(name: string): string {
    return name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }
}
