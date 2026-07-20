import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IMedicalCertificatesRepository } from '../repositories/medical-certificates.repository.interface'

@Injectable()
export class DeleteMedicalCertificateUseCase extends BaseUseCase {
  private readonly logger = new Logger(DeleteMedicalCertificateUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly medicalCertificatesRepository: IMedicalCertificatesRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<void> {
    const clinicId = currentUser.clinicId!

    const certificate = await this.medicalCertificatesRepository.findById(id, clinicId)
    if (!certificate) throw new NotFoundException('Medical certificate not found')

    if (currentUser.role === UserRole.PROFESSIONAL) {
      const professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!professional || professional.id !== certificate.professionalId) {
        throw new ForbiddenException('Insufficient permissions')
      }
    }

    await this.medicalCertificatesRepository.delete(id)

    try {
      await this.cacheService.del(`medical-certificates:appointment:${certificate.appointmentId}`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: DeleteMedicalCertificateUseCase.name })
    }
  }
}
