import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { IStorageAdapter } from '../../../common/adapters/storage.adapter.interface'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IConsultationPhotosRepository } from '../repositories/consultation-photos.repository.interface'

export interface ConsultationPhotoFile {
  buffer: Buffer
  fileName: string
  mimeType: string
}

@Injectable()
export class DownloadConsultationPhotoFileUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly consultationPhotosRepository: IConsultationPhotosRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly storageAdapter: IStorageAdapter,
  ) {
    super(dataSource)
  }

  async execute(photoId: string, currentUser: ICurrentUser): Promise<ConsultationPhotoFile> {
    const clinicId = currentUser.clinicId!

    const photo = await this.consultationPhotosRepository.findById(photoId, clinicId)
    if (!photo) throw new NotFoundException('Consultation photo not found')

    if (currentUser.role === UserRole.PROFESSIONAL) {
      const professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!professional || professional.id !== photo.professionalId) {
        throw new ForbiddenException('Insufficient permissions')
      }
    }

    const buffer = await this.storageAdapter.download(photo.filePath)

    return { buffer, fileName: photo.fileName, mimeType: photo.mimeType }
  }
}
