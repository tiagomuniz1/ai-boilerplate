import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { IDoctorsRepository } from '../repositories/doctors.repository.interface'

@Injectable()
export class DeleteDoctorUseCase extends BaseUseCase {
  private readonly logger = new Logger(DeleteDoctorUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly doctorsRepository: IDoctorsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string): Promise<void> {
    const doctor = await this.doctorsRepository.findById(id)
    if (!doctor) throw new NotFoundException('Doctor not found')

    await this.doctorsRepository.delete(id)

    try {
      await this.cacheService.del(`doctor:${id}`)
      await this.cacheService.delByPattern('doctors:list*')
    } catch {
      this.logger.warn('Cache invalidation failed', { context: DeleteDoctorUseCase.name })
    }
  }
}
