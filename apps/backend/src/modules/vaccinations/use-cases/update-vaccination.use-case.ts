import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { DataSource } from 'typeorm'
import { UpdateVaccinationDto, UserRole, VaccinationResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IVaccinationsRepository } from '../repositories/vaccinations.repository.interface'
import { toVaccinationResponse } from '../vaccination.mapper'

@Injectable()
export class UpdateVaccinationUseCase extends BaseUseCase {
  private readonly logger = new Logger(UpdateVaccinationUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly vaccinationsRepository: IVaccinationsRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(
    id: string,
    dto: UpdateVaccinationDto,
    currentUser: ICurrentUser,
  ): Promise<VaccinationResponseDto> {
    const clinicId = currentUser.clinicId!

    const vaccination = await this.vaccinationsRepository.findById(id, clinicId)
    if (!vaccination) throw new NotFoundException('Vaccination not found')

    // Escopo, não exercício: o ADMIN é zelador da caderneta da clínica e corrige
    // qualquer registro. O profissional só o que ele mesmo lançou.
    if (currentUser.role !== UserRole.ADMIN) {
      const professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!professional || professional.id !== vaccination.recordedByProfessionalId) {
        throw new ForbiddenException('Insufficient permissions')
      }
    }

    if (dto.appliedAt && dto.appliedAt > new Date().toISOString().slice(0, 10)) {
      throw new UnprocessableEntityException('Cannot record a dose applied in the future')
    }

    const updated = await this.vaccinationsRepository.update(id, dto)

    try {
      await this.cacheService.delByPattern(`vaccinations:patient:${vaccination.patientId}*`)
      if (vaccination.appointmentId) {
        await this.cacheService.del(`vaccinations:appointment:${vaccination.appointmentId}`)
      }
    } catch {
      this.logger.warn('Cache invalidation failed', { context: UpdateVaccinationUseCase.name })
    }

    return toVaccinationResponse(updated)
  }
}
