import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { ConsultationPhotoResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IAppointmentsRepository } from '../../appointments/repositories/appointments.repository.interface'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IConsultationPhotosRepository } from '../repositories/consultation-photos.repository.interface'

@Injectable()
export class FindConsultationPhotosByAppointmentUseCase extends BaseUseCase {
  private readonly logger = new Logger(FindConsultationPhotosByAppointmentUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly consultationPhotosRepository: IConsultationPhotosRepository,
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(appointmentId: string, currentUser: ICurrentUser): Promise<ConsultationPhotoResponseDto[]> {
    const clinicId = currentUser.clinicId!

    if (currentUser.role === UserRole.PROFESSIONAL) {
      const appointment = await this.appointmentsRepository.findById(appointmentId, clinicId)
      if (!appointment) throw new NotFoundException('Appointment not found')
      const professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!professional || professional.id !== appointment.professionalId) {
        throw new ForbiddenException('Insufficient permissions')
      }
    }

    const cacheKey = `consultation-photos:appointment:${appointmentId}`

    try {
      const cached = await this.cacheService.get<ConsultationPhotoResponseDto[]>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: FindConsultationPhotosByAppointmentUseCase.name })
    }

    const photos = await this.consultationPhotosRepository.findByAppointment(appointmentId, clinicId)

    const response = photos.map((photo) => ({
      id: photo.id,
      appointmentId: photo.appointmentId,
      fileName: photo.fileName,
      mimeType: photo.mimeType,
      fileSizeBytes: photo.fileSizeBytes,
      createdAt: photo.createdAt,
    }))

    try {
      await this.cacheService.set(cacheKey, response, 60)
    } catch {
      this.logger.warn('Cache write failed', { context: FindConsultationPhotosByAppointmentUseCase.name })
    }

    return response
  }
}
