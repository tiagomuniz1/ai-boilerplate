import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IVaccinationsRepository } from '../repositories/vaccinations.repository.interface'

@Injectable()
export class DeleteVaccinationUseCase extends BaseUseCase {
  private readonly logger = new Logger(DeleteVaccinationUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly vaccinationsRepository: IVaccinationsRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<void> {
    const clinicId = currentUser.clinicId!

    const vaccination = await this.vaccinationsRepository.findById(id, clinicId)
    if (!vaccination) throw new NotFoundException('Vaccination not found')

    // Mesma divisão do update: ADMIN em qualquer um, profissional só nos seus.
    if (currentUser.role !== UserRole.ADMIN) {
      const professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!professional || professional.id !== vaccination.recordedByProfessionalId) {
        throw new ForbiddenException('Insufficient permissions')
      }
    }

    await this.vaccinationsRepository.delete(id)

    try {
      await this.cacheService.delByPattern(`vaccinations:patient:${vaccination.patientId}*`)
      if (vaccination.appointmentId) {
        await this.cacheService.del(`vaccinations:appointment:${vaccination.appointmentId}`)
      }
    } catch {
      this.logger.warn('Cache invalidation failed', { context: DeleteVaccinationUseCase.name })
    }
  }
}
