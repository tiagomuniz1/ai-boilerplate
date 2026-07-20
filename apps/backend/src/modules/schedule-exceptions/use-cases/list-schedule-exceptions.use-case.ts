import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { PaginatedScheduleExceptionsResponseDto, ScheduleExceptionResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IScheduleExceptionsRepository } from '../repositories/schedule-exceptions.repository.interface'
import { ListScheduleExceptionsQueryDto } from '../dto/list-schedule-exceptions-query.dto'
import { ScheduleException } from '../entities/schedule-exception.entity'

@Injectable()
export class ListScheduleExceptionsUseCase extends BaseUseCase {
  private readonly logger = new Logger(ListScheduleExceptionsUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly scheduleExceptionsRepository: IScheduleExceptionsRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(
    query: ListScheduleExceptionsQueryDto,
    currentUser: ICurrentUser,
  ): Promise<PaginatedScheduleExceptionsResponseDto> {
    const clinicId = currentUser.clinicId!
    const effectiveQuery = { ...query }

    if (currentUser.role === UserRole.DOCTOR) {
      const doctor = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!doctor) throw new NotFoundException('Professional not found')
      effectiveQuery.doctorId = doctor.id
    }

    const { doctorId, from, to, page = 1, limit = 20 } = effectiveQuery

    const cacheKey = `schedule-exceptions:list:${clinicId}:${doctorId ?? 'all'}:${from ?? 'all'}:${to ?? 'all'}:${page}:${limit}`

    try {
      const cached = await this.cacheService.get<PaginatedScheduleExceptionsResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: ListScheduleExceptionsUseCase.name })
    }

    const [exceptions, total] = await this.scheduleExceptionsRepository.findAll(effectiveQuery, clinicId)

    const result: PaginatedScheduleExceptionsResponseDto = {
      data: exceptions.map(this.toResponse),
      total,
      page,
      limit,
    }

    try {
      await this.cacheService.set(cacheKey, result, 60)
    } catch {
      this.logger.warn('Cache write failed', { context: ListScheduleExceptionsUseCase.name })
    }

    return result
  }

  private toResponse(exception: ScheduleException): ScheduleExceptionResponseDto {
    return {
      id: exception.id,
      doctorId: exception.doctorId,
      date: exception.date,
      startTime: exception.startTime,
      endTime: exception.endTime,
      reason: exception.reason,
      createdAt: exception.createdAt,
      updatedAt: exception.updatedAt,
    }
  }
}
