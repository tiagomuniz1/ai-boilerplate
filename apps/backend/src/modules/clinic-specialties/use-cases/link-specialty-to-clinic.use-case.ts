import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { ClinicSpecialtyResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { FindClinicByIdUseCase } from '../../clinics/use-cases/find-clinic-by-id.use-case'
import { ISpecialtiesRepository } from '../../specialties/repositories/specialties.repository.interface'
import { IClinicSpecialtiesRepository } from '../repositories/clinic-specialties.repository.interface'
import { ClinicSpecialty } from '../entities/clinic-specialty.entity'

@Injectable()
export class LinkSpecialtyToClinicUseCase extends BaseUseCase {
  private readonly logger = new Logger(LinkSpecialtyToClinicUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly clinicSpecialtiesRepository: IClinicSpecialtiesRepository,
    private readonly findClinicByIdUseCase: FindClinicByIdUseCase,
    private readonly specialtiesRepository: ISpecialtiesRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(clinicId: string, specialtyId: string): Promise<ClinicSpecialtyResponseDto> {
    await this.findClinicByIdUseCase.execute(clinicId)

    const specialty = await this.specialtiesRepository.findById(specialtyId)
    if (!specialty) throw new NotFoundException('Specialty not found')

    const existing = await this.clinicSpecialtiesRepository.findByClinicAndSpecialty(
      clinicId,
      specialtyId,
    )
    if (existing) throw new ConflictException('Specialty is already linked to this clinic')

    const record = await this.clinicSpecialtiesRepository.link(clinicId, specialtyId)

    try {
      await this.cacheService.delByPattern(`clinic-specialties:${clinicId}*`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: LinkSpecialtyToClinicUseCase.name })
    }

    return this.toResponse(record, specialty.name, specialty.description)
  }

  private toResponse(
    record: ClinicSpecialty,
    name: string,
    description: string | null,
  ): ClinicSpecialtyResponseDto {
    return {
      id: record.id,
      clinicId: record.clinicId,
      specialtyId: record.specialtyId,
      name,
      description,
      linkedAt: record.createdAt,
    }
  }
}
