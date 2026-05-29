import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource, QueryRunner } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { IPatientsRepository } from '../repositories/patients.repository.interface'

@Injectable()
export class DeletePatientUseCase extends BaseUseCase {
  private readonly logger = new Logger(DeletePatientUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly patientsRepository: IPatientsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string): Promise<void> {
    const patient = await this.patientsRepository.findById(id)
    if (!patient) throw new NotFoundException('Patient not found')

    await this.patientsRepository.delete(id)

    try {
      await this.cacheService.del(`patient:${id}`)
      await this.cacheService.delByPattern('patients:list*')
    } catch {
      this.logger.warn('Cache invalidation failed', { context: DeletePatientUseCase.name })
    }
  }

  async deleteByUserId(userId: string, queryRunner?: QueryRunner): Promise<void> {
    const patient = await this.patientsRepository.findByUserId(userId)
    if (!patient) return

    await this.patientsRepository.delete(patient.id, queryRunner)

    try {
      await this.cacheService.del(`patient:${patient.id}`)
      await this.cacheService.delByPattern('patients:list*')
    } catch {
      this.logger.warn('Cache invalidation failed', { context: DeletePatientUseCase.name })
    }
  }
}
