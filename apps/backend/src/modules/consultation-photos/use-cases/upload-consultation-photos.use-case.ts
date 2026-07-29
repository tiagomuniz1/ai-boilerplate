import { ForbiddenException, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { DataSource } from 'typeorm'
import { ConsultationPhotoResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { IStorageAdapter } from '../../../common/adapters/storage.adapter.interface'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IAppointmentsRepository } from '../../appointments/repositories/appointments.repository.interface'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IConsultationPhotosRepository } from '../repositories/consultation-photos.repository.interface'
import { ConsultationPhoto } from '../entities/consultation-photo.entity'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 8 * 1024 * 1024

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

function toResponse(photo: ConsultationPhoto): ConsultationPhotoResponseDto {
  return {
    id: photo.id,
    appointmentId: photo.appointmentId,
    fileName: photo.fileName,
    mimeType: photo.mimeType,
    fileSizeBytes: photo.fileSizeBytes,
    createdAt: photo.createdAt,
  }
}

@Injectable()
export class UploadConsultationPhotosUseCase extends BaseUseCase {
  private readonly logger = new Logger(UploadConsultationPhotosUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly consultationPhotosRepository: IConsultationPhotosRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly storageAdapter: IStorageAdapter,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(
    appointmentId: string,
    files: Express.Multer.File[],
    currentUser: ICurrentUser,
  ): Promise<ConsultationPhotoResponseDto[]> {
    const clinicId = currentUser.clinicId!

    const appointment = await this.appointmentsRepository.findById(appointmentId, clinicId)
    if (!appointment) throw new NotFoundException('Appointment not found')

    const professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
    if (!professional || professional.id !== appointment.professionalId) {
      throw new ForbiddenException('Insufficient permissions')
    }

    if (!files || files.length === 0) {
      throw new UnprocessableEntityException('At least one file is required')
    }

    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        throw new UnprocessableEntityException('Invalid file type. Accepted: jpeg, png, webp')
      }
      if (file.size > MAX_SIZE_BYTES) {
        throw new UnprocessableEntityException('File too large. Maximum size is 8MB')
      }
    }

    const uploads = await Promise.all(
      files.map(async (file) => {
        const photoId = randomUUID()
        const ext = MIME_TO_EXT[file.mimetype]
        const path = `consultation-photos/${clinicId}/${appointmentId}/${photoId}.${ext}`
        const filePath = await this.storageAdapter.upload(file.buffer, path, file.mimetype)
        return { photoId, file, filePath }
      }),
    )

    const photos = await this.runInTransaction(async (queryRunner) => {
      const created: ConsultationPhoto[] = []
      for (const upload of uploads) {
        const photo = await this.consultationPhotosRepository.create(
          {
            id: upload.photoId,
            clinicId,
            appointmentId,
            patientId: appointment.patientId,
            professionalId: appointment.professionalId,
            filePath: upload.filePath,
            fileName: upload.file.originalname,
            mimeType: upload.file.mimetype,
            fileSizeBytes: upload.file.size,
            uploadedByUserId: currentUser.id,
          },
          queryRunner,
        )
        created.push(photo)
      }
      return created
    })

    try {
      await this.cacheService.del(`consultation-photos:appointment:${appointmentId}`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: UploadConsultationPhotosUseCase.name })
    }

    return photos.map(toResponse)
  }
}
