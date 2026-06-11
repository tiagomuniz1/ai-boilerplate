import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { ClinicResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { IClinicsRepository } from '../repositories/clinics.repository.interface'
import { Clinic } from '../entities/clinic.entity'

@Injectable()
export class FindClinicByIdUseCase extends BaseUseCase {
  private readonly logger = new Logger(FindClinicByIdUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly clinicsRepository: IClinicsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string): Promise<ClinicResponseDto> {
    const cacheKey = `clinic:${id}`

    try {
      const cached = await this.cacheService.get<ClinicResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: FindClinicByIdUseCase.name })
    }

    const clinic = await this.clinicsRepository.findById(id)
    if (!clinic) throw new NotFoundException('Clinic not found')

    const response = this.toResponse(clinic)

    try {
      await this.cacheService.set(cacheKey, response, 300)
    } catch {
      this.logger.warn('Cache write failed', { context: FindClinicByIdUseCase.name })
    }

    return response
  }

  private toResponse(clinic: Clinic): ClinicResponseDto {
    return {
      id: clinic.id,
      name: clinic.name,
      slug: clinic.slug,
      isActive: clinic.isActive,
      themeId: clinic.themeId ?? null,
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
