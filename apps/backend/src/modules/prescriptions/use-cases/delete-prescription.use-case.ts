import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IPrescriptionsRepository } from '../repositories/prescriptions.repository.interface'

@Injectable()
export class DeletePrescriptionUseCase extends BaseUseCase {
  private readonly logger = new Logger(DeletePrescriptionUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly prescriptionsRepository: IPrescriptionsRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<void> {
    const clinicId = currentUser.clinicId!

    const prescription = await this.prescriptionsRepository.findById(id, clinicId)
    if (!prescription) throw new NotFoundException('Prescription not found')

    if (currentUser.role === UserRole.PROFESSIONAL) {
      const professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!professional || professional.id !== prescription.professionalId) {
        throw new ForbiddenException('Insufficient permissions')
      }
    }

    await this.prescriptionsRepository.delete(id)

    try {
      await this.cacheService.del(`prescriptions:appointment:${prescription.appointmentId}`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: DeletePrescriptionUseCase.name })
    }
  }
}
