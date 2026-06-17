import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource, OptimisticLockVersionMismatchError } from 'typeorm'
import { ClinicResponseDto, UpdateClinicDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { IClinicsRepository } from '../repositories/clinics.repository.interface'
import { Clinic } from '../entities/clinic.entity'

@Injectable()
export class UpdateClinicUseCase extends BaseUseCase {
  private readonly logger = new Logger(UpdateClinicUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly clinicsRepository: IClinicsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string, dto: UpdateClinicDto): Promise<ClinicResponseDto> {
    const clinic = await this.clinicsRepository.findById(id)
    if (!clinic) throw new NotFoundException('Clinic not found')

    if (dto.slug !== undefined && dto.slug !== clinic.slug) {
      const RESERVED_SLUGS = ['backoffice']
      if (RESERVED_SLUGS.includes(dto.slug)) throw new ConflictException('Slug is reserved and cannot be used')
      const existing = await this.clinicsRepository.findBySlug(dto.slug)
      if (existing) throw new ConflictException('Slug already in use')
    }

    let updated: Clinic
    try {
      updated = await this.clinicsRepository.update(id, dto)
    } catch (error) {
      if (error instanceof OptimisticLockVersionMismatchError) {
        throw new ConflictException('Record was modified by another process. Please try again.')
      }
      throw error
    }

    try {
      await this.cacheService.del(`clinic:${id}`)
      await this.cacheService.delByPattern('clinics:list*')
      if ('themeId' in dto) {
        await this.cacheService.del(`theme:clinic:${id}`)
      }
    } catch {
      this.logger.warn('Cache invalidation failed', { context: UpdateClinicUseCase.name })
    }

    return this.toResponse(updated)
  }

  private toResponse(clinic: Clinic): ClinicResponseDto {
    return {
      id: clinic.id,
      name: clinic.name,
      slug: clinic.slug,
      isActive: clinic.isActive,
      themeId: clinic.themeId ?? null,
      logoUrl: clinic.logoUrl ?? null,
      logoDarkUrl: clinic.logoDarkUrl ?? null,
      faviconUrl: clinic.faviconUrl ?? null,
      address: clinic.addressStreet != null
        ? {
            street: clinic.addressStreet,
            number: clinic.addressNumber!,
            complement: clinic.addressComplement,
            neighborhood: clinic.addressNeighborhood!,
            city: clinic.addressCity!,
            state: clinic.addressState!,
            zipCode: clinic.addressZipCode!,
            country: clinic.addressCountry!,
          }
        : null,
      createdAt: clinic.createdAt,
      updatedAt: clinic.updatedAt,
    }
  }
}
