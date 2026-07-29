import { Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { PaginatedConsultationPhotosResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IConsultationPhotosRepository } from '../repositories/consultation-photos.repository.interface'
import { ListConsultationPhotosByPatientQueryDto } from '../dto/list-consultation-photos-by-patient-query.dto'

@Injectable()
export class FindConsultationPhotosByPatientUseCase extends BaseUseCase {
  private readonly logger = new Logger(FindConsultationPhotosByPatientUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly consultationPhotosRepository: IConsultationPhotosRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(
    patientId: string,
    query: ListConsultationPhotosByPatientQueryDto,
    currentUser: ICurrentUser,
  ): Promise<PaginatedConsultationPhotosResponseDto> {
    const clinicId = currentUser.clinicId!
    const { page, limit } = query

    // Server-side only — there is no client-supplied professionalId to consider (see the DTO).
    let professionalIdFilter: string | undefined
    if (currentUser.role === UserRole.PROFESSIONAL) {
      const professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      professionalIdFilter = professional?.id
    }

    const cacheKey = `consultation-photos:patient:${patientId}:${page}:${limit}:${professionalIdFilter ?? 'all'}`

    try {
      const cached = await this.cacheService.get<PaginatedConsultationPhotosResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: FindConsultationPhotosByPatientUseCase.name })
    }

    const [photos, total] = await this.consultationPhotosRepository.findByPatient(
      clinicId,
      patientId,
      page,
      limit,
      professionalIdFilter,
    )

    const result: PaginatedConsultationPhotosResponseDto = {
      data: photos.map((photo) => ({
        id: photo.id,
        appointmentId: photo.appointmentId,
        fileName: photo.fileName,
        mimeType: photo.mimeType,
        fileSizeBytes: photo.fileSizeBytes,
        createdAt: photo.createdAt,
        professionalName: photo.professionalName,
        appointmentDate: photo.appointmentDate,
      })),
      total,
      page,
      limit,
    }

    try {
      await this.cacheService.set(cacheKey, result, 60)
    } catch {
      this.logger.warn('Cache write failed', { context: FindConsultationPhotosByPatientUseCase.name })
    }

    return result
  }
}
