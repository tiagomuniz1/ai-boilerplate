import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { PaginatedSchedulesResponseDto, ScheduleResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { ISchedulesRepository } from '../repositories/schedules.repository.interface'
import { ListSchedulesQueryDto } from '../dto/list-schedules-query.dto'
import { Schedule } from '../entities/schedule.entity'

@Injectable()
export class ListSchedulesUseCase extends BaseUseCase {
  private readonly logger = new Logger(ListSchedulesUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly schedulesRepository: ISchedulesRepository,
    private readonly doctorsRepository: IDoctorsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(
    query: ListSchedulesQueryDto,
    currentUser: ICurrentUser,
  ): Promise<PaginatedSchedulesResponseDto> {
    const effectiveQuery = { ...query }

    if (currentUser.role === UserRole.DOCTOR) {
      const doctor = await this.doctorsRepository.findByUserId(currentUser.id)
      if (!doctor) throw new NotFoundException('Doctor not found')
      effectiveQuery.doctorId = doctor.id
    }

    const { doctorId, dayOfWeek, activeOn, page = 1, limit = 20 } = effectiveQuery

    const cacheKey = `schedules:list:${doctorId ?? 'all'}:${dayOfWeek ?? 'all'}:${activeOn ?? 'all'}:${page}:${limit}`

    try {
      const cached = await this.cacheService.get<PaginatedSchedulesResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: ListSchedulesUseCase.name })
    }

    const [schedules, total] = await this.schedulesRepository.findAll(effectiveQuery)

    const result: PaginatedSchedulesResponseDto = {
      data: schedules.map((s) => this.toResponse(s)),
      total,
      page,
      limit,
    }

    try {
      await this.cacheService.set(cacheKey, result, 60)
    } catch {
      this.logger.warn('Cache write failed', { context: ListSchedulesUseCase.name })
    }

    return result
  }

  private toResponse(schedule: Schedule): ScheduleResponseDto {
    return {
      id: schedule.id,
      doctorId: schedule.doctorId,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      slotDurationInMinutes: schedule.slotDurationInMinutes,
      validFrom: schedule.validFrom,
      validUntil: schedule.validUntil,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
    }
  }
}
