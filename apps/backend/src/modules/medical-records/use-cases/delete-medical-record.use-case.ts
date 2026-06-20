import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IMedicalRecordsRepository } from '../repositories/medical-records.repository.interface'
import { CacheService } from '../../../cache/cache.service'

@Injectable()
export class DeleteMedicalRecordUseCase extends BaseUseCase {
  private readonly logger = new Logger(DeleteMedicalRecordUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly medicalRecordsRepository: IMedicalRecordsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<void> {
    const clinicId = currentUser.clinicId!

    const record = await this.medicalRecordsRepository.findById(id, clinicId)
    if (!record) throw new NotFoundException('Medical record not found')

    await this.medicalRecordsRepository.delete(id, clinicId)

    try {
      await this.cacheService.delByPattern(`medical_records:patient:${record.patientId}*`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: 'DeleteMedicalRecordUseCase' })
    }
  }
}
