import { Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { AvailabilityResponseDto, AvailableSlotDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { GetActiveSchedulesForProfessionalUseCase } from '../../schedules/use-cases/get-active-schedules-for-professional.use-case'
import { GetActiveExceptionsForProfessionalUseCase } from '../../schedule-exceptions/use-cases/get-active-exceptions-for-professional.use-case'
import { AvailabilityQueryDto } from '../dto/availability-query.dto'
import { IAppointmentsRepository } from '../repositories/appointments.repository.interface'
import { generateSlots, isSlotBlockedByExceptions } from '../utils/slot.util'

@Injectable()
export class GetAvailabilityUseCase extends BaseUseCase {
  private readonly logger = new Logger(GetAvailabilityUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly getActiveSchedulesUseCase: GetActiveSchedulesForProfessionalUseCase,
    private readonly getActiveExceptionsUseCase: GetActiveExceptionsForProfessionalUseCase,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(query: AvailabilityQueryDto, currentUser: ICurrentUser): Promise<AvailabilityResponseDto> {
    const clinicId = currentUser.clinicId!

    let professionalId: string
    if (currentUser.role === UserRole.PROFESSIONAL) {
      const professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!professional) throw new NotFoundException('Professional not found')
      professionalId = professional.id
    } else {
      if (!query.professionalId) throw new UnprocessableEntityException('professionalId is required')
      const professional = await this.professionalsRepository.findById(query.professionalId, clinicId)
      if (!professional) throw new NotFoundException('Professional not found')
      professionalId = professional.id
    }

    const cacheKey = `appointments:availability:${clinicId}:${professionalId}:${query.date}`

    try {
      const cached = await this.cacheService.get<AvailabilityResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: GetAvailabilityUseCase.name })
    }

    const schedules = await this.getActiveSchedulesUseCase.execute(professionalId, clinicId, query.date)

    const allSlots: AvailableSlotDto[] = schedules.flatMap((s) => generateSlots(s))

    const bookedAppointments = await this.appointmentsRepository.findActiveByProfessionalAndDate(
      professionalId,
      query.date,
      clinicId,
    )
    const bookedStartTimes = new Set(bookedAppointments.map((a) => a.startTime))

    const exceptions = await this.getActiveExceptionsUseCase.execute(professionalId, clinicId, query.date)

    const freeSlots = allSlots
      .filter((slot) => !bookedStartTimes.has(slot.startTime))
      .filter((slot) => !isSlotBlockedByExceptions(slot, exceptions))
      .sort((a, b) => a.startTime.localeCompare(b.startTime))

    const result: AvailabilityResponseDto = {
      professionalId,
      date: query.date,
      slots: freeSlots,
    }

    try {
      await this.cacheService.set(cacheKey, result, 30)
    } catch {
      this.logger.warn('Cache write failed', { context: GetAvailabilityUseCase.name })
    }

    return result
  }
}
