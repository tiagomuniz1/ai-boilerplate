import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { IStorageAdapter } from '../../../common/adapters/storage.adapter.interface'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IConsultationPhotosRepository } from '../repositories/consultation-photos.repository.interface'

@Injectable()
export class DeleteConsultationPhotoUseCase extends BaseUseCase {
  private readonly logger = new Logger(DeleteConsultationPhotoUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly consultationPhotosRepository: IConsultationPhotosRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly storageAdapter: IStorageAdapter,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(photoId: string, currentUser: ICurrentUser): Promise<void> {
    const clinicId = currentUser.clinicId!

    const photo = await this.consultationPhotosRepository.findById(photoId, clinicId)
    if (!photo) throw new NotFoundException('Consultation photo not found')

    // ADMIN can delete any photo in the clinic — only PROFESSIONAL is restricted to their own.
    if (currentUser.role === UserRole.PROFESSIONAL) {
      const professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!professional || professional.id !== photo.professionalId) {
        throw new ForbiddenException('Insufficient permissions')
      }
    }

    await this.runInTransaction(async (queryRunner) => {
      await this.consultationPhotosRepository.delete(photoId, queryRunner)
    })

    try {
      await this.storageAdapter.remove(photo.filePath)
    } catch {
      this.logger.warn('Storage file removal failed', { context: DeleteConsultationPhotoUseCase.name, photoId })
    }

    try {
      await this.cacheService.del(`consultation-photos:appointment:${photo.appointmentId}`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: DeleteConsultationPhotoUseCase.name })
    }
  }
}
