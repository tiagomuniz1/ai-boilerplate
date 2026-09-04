import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IVaccineIndicationsRepository } from '../repositories/vaccine-indications.repository.interface'

@Injectable()
export class DeleteVaccineIndicationUseCase extends BaseUseCase {
  private readonly logger = new Logger(DeleteVaccineIndicationUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly vaccineIndicationsRepository: IVaccineIndicationsRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<void> {
    const clinicId = currentUser.clinicId!

    const indication = await this.vaccineIndicationsRepository.findById(id, clinicId)
    if (!indication) throw new NotFoundException('Vaccine indication not found')

    if (currentUser.role === UserRole.PROFESSIONAL) {
      const professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!professional || professional.id !== indication.professionalId) {
        throw new ForbiddenException('Insufficient permissions')
      }
    }

    await this.vaccineIndicationsRepository.delete(id)

    try {
      await this.cacheService.del(`vaccine-indications:appointment:${indication.appointmentId}`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: DeleteVaccineIndicationUseCase.name })
    }
  }
}
