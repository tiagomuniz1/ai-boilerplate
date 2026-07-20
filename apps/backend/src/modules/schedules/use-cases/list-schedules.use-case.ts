import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { PaginatedSchedulesResponseDto, ScheduleResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { ISchedulesRepository } from '../repositories/schedules.repository.interface'
import { ListSchedulesQueryDto } from '../dto/list-schedules-query.dto'
import { Schedule } from '../entities/schedule.entity'

@Injectable()
export class ListSchedulesUseCase extends BaseUseCase {
  private readonly logger = new Logger(ListSchedulesUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly schedulesRepository: ISchedulesRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(
    query: ListSchedulesQueryDto,
    currentUser: ICurrentUser,
  ): Promise<PaginatedSchedulesResponseDto> {
    const clinicId = currentUser.clinicId!
    const effectiveQuery = { ...query }

    if (currentUser.role === UserRole.DOCTOR) {
      const doctor = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!doctor) throw new NotFoundException('Professional not found')
      effectiveQuery.doctorId = doctor.id
    }

    const { doctorId, dayOfWeek, activeOn, page = 1, limit = 20 } = effectiveQuery

    const cacheKey = `schedules:list:${clinicId}:${doctorId ?? 'all'}:${dayOfWeek ?? 'all'}:${activeOn ?? 'all'}:${page}:${limit}`

    try {
      const cached = await this.cacheService.get<PaginatedSchedulesResponseDto>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: ListSchedulesUseCase.name })
    }

    const [schedules, total] = await this.schedulesRepository.findAll(effectiveQuery, clinicId)

    const doctorIds = [...new Set(schedules.map((s) => s.doctorId))]
    const doctorNames = await this.fetchDoctorNames(doctorIds)

    const result: PaginatedSchedulesResponseDto = {
      data: schedules.map((s) => this.toResponse(s, doctorNames.get(s.doctorId) ?? '')),
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

  private async fetchDoctorNames(doctorIds: string[]): Promise<Map<string, string>> {
    if (doctorIds.length === 0) return new Map()
    const rows: Array<{ doctorId: string; fullName: string }> = await this.dataSource
      .createQueryBuilder()
      .select('d.id', 'doctorId')
      .addSelect('u.full_name', 'fullName')
      .from('professionals', 'd')
      .innerJoin('users', 'u', 'u.id = d.user_id AND u.deleted_at IS NULL')
      .where('d.id IN (:...ids)', { ids: doctorIds })
      .andWhere('d.deleted_at IS NULL')
      .getRawMany()
    return new Map(rows.map((r) => [r.doctorId, r.fullName]))
  }

  private toResponse(schedule: Schedule, doctorName: string): ScheduleResponseDto {
    return {
      id: schedule.id,
      doctorId: schedule.doctorId,
      doctorName,
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
