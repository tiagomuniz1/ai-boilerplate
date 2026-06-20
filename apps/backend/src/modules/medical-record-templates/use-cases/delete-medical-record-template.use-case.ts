import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IMedicalRecordTemplatesRepository } from '../repositories/medical-record-templates.repository.interface'

@Injectable()
export class DeleteMedicalRecordTemplateUseCase extends BaseUseCase {
  private readonly logger = new Logger(DeleteMedicalRecordTemplateUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly templatesRepository: IMedicalRecordTemplatesRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<void> {
    const clinicId = currentUser.clinicId!

    const template = await this.templatesRepository.findById(id, clinicId)
    if (!template) throw new NotFoundException('Template not found')

    await this.templatesRepository.delete(id, clinicId)

    try {
      await this.cacheService.del(`medical_record_template:${clinicId}:${id}`)
      await this.cacheService.delByPattern(`medical_record_templates:list:${clinicId}*`)
    } catch {
      this.logger.warn('Cache invalidation failed', {
        context: DeleteMedicalRecordTemplateUseCase.name,
      })
    }
  }
}
