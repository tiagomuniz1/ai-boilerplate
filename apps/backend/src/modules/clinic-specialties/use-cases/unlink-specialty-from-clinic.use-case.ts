import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { IClinicSpecialtiesRepository } from '../repositories/clinic-specialties.repository.interface'

@Injectable()
export class UnlinkSpecialtyFromClinicUseCase extends BaseUseCase {
  private readonly logger = new Logger(UnlinkSpecialtyFromClinicUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly clinicSpecialtiesRepository: IClinicSpecialtiesRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(clinicId: string, specialtyId: string): Promise<void> {
    const existing = await this.clinicSpecialtiesRepository.findByClinicAndSpecialty(
      clinicId,
      specialtyId,
    )
    if (!existing) throw new NotFoundException('Specialty is not linked to this clinic')

    await this.clinicSpecialtiesRepository.unlink(existing.id)

    try {
      await this.cacheService.delByPattern(`clinic-specialties:${clinicId}*`)
    } catch {
      this.logger.warn('Cache invalidation failed', {
        context: UnlinkSpecialtyFromClinicUseCase.name,
      })
    }
  }
}
