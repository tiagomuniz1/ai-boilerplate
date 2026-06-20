import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ISpecialtiesRepository } from '../repositories/specialties.repository.interface'

@Injectable()
export class DeleteSpecialtyUseCase extends BaseUseCase {
  private readonly logger = new Logger(DeleteSpecialtyUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly specialtiesRepository: ISpecialtiesRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string): Promise<void> {
    const specialty = await this.specialtiesRepository.findById(id)
    if (!specialty) throw new NotFoundException('Specialty not found')

    const linkedDoctors = await this.specialtiesRepository.countLinkedDoctors(id)
    if (linkedDoctors > 0) {
      throw new ConflictException(
        `Specialty is linked to ${linkedDoctors} doctor${linkedDoctors > 1 ? 's' : ''} and cannot be deleted`,
      )
    }

    const linkedClinics = await this.specialtiesRepository.countLinkedClinics(id)
    if (linkedClinics > 0) {
      throw new ConflictException(
        `Specialty is linked to ${linkedClinics} clinic(s) and cannot be deleted`,
      )
    }

    const linkedAppointments = await this.specialtiesRepository.countLinkedAppointments(id)
    if (linkedAppointments > 0) {
      throw new ConflictException(
        `Specialty has ${linkedAppointments} appointment(s) and cannot be deleted`,
      )
    }

    await this.specialtiesRepository.delete(id)

    try {
      await this.cacheService.del(`specialty:${id}`)
      await this.cacheService.delByPattern('specialties:list*')
    } catch {
      this.logger.warn('Cache invalidation failed', { context: DeleteSpecialtyUseCase.name })
    }
  }
}
