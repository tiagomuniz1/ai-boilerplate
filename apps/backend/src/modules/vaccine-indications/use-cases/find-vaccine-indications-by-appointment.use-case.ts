import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { UserRole, VaccineIndicationResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IAppointmentsRepository } from '../../appointments/repositories/appointments.repository.interface'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IVaccineIndicationsRepository } from '../repositories/vaccine-indications.repository.interface'
import { toVaccineIndicationResponse } from './create-vaccine-indication.use-case'

@Injectable()
export class FindVaccineIndicationsByAppointmentUseCase extends BaseUseCase {
  private readonly logger = new Logger(FindVaccineIndicationsByAppointmentUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly vaccineIndicationsRepository: IVaccineIndicationsRepository,
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(appointmentId: string, currentUser: ICurrentUser): Promise<VaccineIndicationResponseDto[]> {
    const clinicId = currentUser.clinicId!

    if (currentUser.role === UserRole.PROFESSIONAL) {
      const appointment = await this.appointmentsRepository.findById(appointmentId, clinicId)
      if (!appointment) throw new NotFoundException('Appointment not found')
      const professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!professional || professional.id !== appointment.professionalId) {
        throw new ForbiddenException('Insufficient permissions')
      }
    }

    const cacheKey = `vaccine-indications:appointment:${appointmentId}`

    try {
      const cached = await this.cacheService.get<VaccineIndicationResponseDto[]>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: FindVaccineIndicationsByAppointmentUseCase.name })
    }

    const indications = await this.vaccineIndicationsRepository.findByAppointment(appointmentId, clinicId)
    const result = indications.map(toVaccineIndicationResponse)

    try {
      await this.cacheService.set(cacheKey, result, 60)
    } catch {
      this.logger.warn('Cache write failed', { context: FindVaccineIndicationsByAppointmentUseCase.name })
    }

    return result
  }
}
