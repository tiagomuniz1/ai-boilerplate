import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { DataSource, OptimisticLockVersionMismatchError } from 'typeorm'
import { UpdateScheduleExceptionDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IAppointmentsRepository } from '../repositories/appointments.repository.adapter'
import { IScheduleExceptionsRepository } from '../repositories/schedule-exceptions.repository.interface'
import { ScheduleException } from '../entities/schedule-exception.entity'

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

@Injectable()
export class UpdateScheduleExceptionUseCase extends BaseUseCase {
  private readonly logger = new Logger(UpdateScheduleExceptionUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly scheduleExceptionsRepository: IScheduleExceptionsRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string, dto: UpdateScheduleExceptionDto, currentUser: ICurrentUser): Promise<ScheduleException> {
    const clinicId = currentUser.clinicId!

    const exception = await this.scheduleExceptionsRepository.findById(id, clinicId)
    if (!exception) throw new NotFoundException('Schedule exception not found')

    if (currentUser.role === UserRole.PROFESSIONAL) {
      const professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!professional || exception.professionalId !== professional.id) {
        throw new ForbiddenException('You are not allowed to manage this schedule exception')
      }
    }

    const merged = {
      date: dto.date !== undefined ? dto.date : exception.date,
      startTime: dto.startTime !== undefined ? dto.startTime : exception.startTime,
      endTime: dto.endTime !== undefined ? dto.endTime : exception.endTime,
      reason: dto.reason !== undefined ? dto.reason : exception.reason,
    }

    if (merged.startTime !== null && merged.endTime !== null) {
      if (timeToMinutes(merged.startTime) >= timeToMinutes(merged.endTime)) {
        throw new UnprocessableEntityException('startTime must be before endTime')
      }
    }

    const conflicts = await this.appointmentsRepository.findScheduledAppointmentsInWindow(
      exception.professionalId,
      merged.date,
      merged.startTime,
      merged.endTime,
      clinicId,
    )

    if (conflicts.length > 0) {
      const times = conflicts.map((c) => c.startTime).join(', ')
      throw new ConflictException(
        `There are scheduled appointments in this period (${times}). Reschedule or cancel them before blocking this time.`,
      )
    }

    let updated: ScheduleException
    try {
      updated = await this.scheduleExceptionsRepository.update(id, merged)
    } catch (error) {
      if (error instanceof OptimisticLockVersionMismatchError) {
        throw new ConflictException('Record was modified by another process. Please try again.')
      }
      throw error
    }

    try {
      await this.cacheService.delByPrefix(`schedule-exceptions:list:${clinicId}:${exception.professionalId}:`)
      await this.cacheService.delByPrefix(`schedule-exceptions:list:${clinicId}:all:`)
      await this.cacheService.del(`appointments:availability:${clinicId}:${exception.professionalId}:${exception.date}`)
      if (merged.date !== exception.date) {
        await this.cacheService.del(`appointments:availability:${clinicId}:${exception.professionalId}:${merged.date}`)
      }
    } catch {
      this.logger.warn('Cache invalidation failed', { context: UpdateScheduleExceptionUseCase.name })
    }

    return updated
  }
}
