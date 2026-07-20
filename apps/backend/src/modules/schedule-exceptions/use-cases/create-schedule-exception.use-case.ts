import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { DataSource } from 'typeorm'
import { CreateScheduleExceptionDto, UserRole } from '@app/shared'
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
export class CreateScheduleExceptionUseCase extends BaseUseCase {
  private readonly logger = new Logger(CreateScheduleExceptionUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly scheduleExceptionsRepository: IScheduleExceptionsRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(dto: CreateScheduleExceptionDto, currentUser: ICurrentUser): Promise<ScheduleException> {
    const clinicId = currentUser.clinicId!

    let doctorId: string
    if (currentUser.role === UserRole.DOCTOR) {
      const doctor = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!doctor) throw new NotFoundException('Professional not found')
      doctorId = doctor.id
    } else {
      if (!dto.doctorId) throw new UnprocessableEntityException('doctorId is required for admin')
      const doctor = await this.professionalsRepository.findById(dto.doctorId, clinicId)
      if (!doctor) throw new NotFoundException('Professional not found')
      doctorId = doctor.id
    }

    const startTime = dto.startTime ?? null
    const endTime = dto.endTime ?? null

    if (startTime !== null && endTime !== null) {
      if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
        throw new UnprocessableEntityException('startTime must be before endTime')
      }
    }

    const conflicts = await this.appointmentsRepository.findScheduledAppointmentsInWindow(
      doctorId,
      dto.date,
      startTime,
      endTime,
      clinicId,
    )

    if (conflicts.length > 0) {
      const times = conflicts.map((c) => c.startTime).join(', ')
      throw new ConflictException(
        `There are scheduled appointments in this period (${times}). Reschedule or cancel them before blocking this time.`,
      )
    }

    const exception = await this.scheduleExceptionsRepository.create({
      clinicId,
      doctorId,
      date: dto.date,
      startTime,
      endTime,
      reason: dto.reason ?? null,
    })

    try {
      await this.cacheService.delByPrefix(`schedule-exceptions:list:${clinicId}:${doctorId}:`)
      await this.cacheService.delByPrefix(`schedule-exceptions:list:${clinicId}:all:`)
      await this.cacheService.del(`appointments:availability:${clinicId}:${doctorId}:${dto.date}`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: CreateScheduleExceptionUseCase.name })
    }

    return exception
  }
}
