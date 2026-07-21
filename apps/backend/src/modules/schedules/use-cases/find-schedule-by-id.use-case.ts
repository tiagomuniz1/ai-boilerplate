import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { ScheduleResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { ISchedulesRepository } from '../repositories/schedules.repository.interface'
import { Schedule } from '../entities/schedule.entity'

@Injectable()
export class FindScheduleByIdUseCase extends BaseUseCase {
  private readonly logger = new Logger(FindScheduleByIdUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly schedulesRepository: ISchedulesRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<ScheduleResponseDto> {
    const clinicId = currentUser.clinicId!
    const cacheKey = `schedule:${clinicId}:${id}`

    let doctorProfileId: string | null = null
    if (currentUser.role === UserRole.PROFESSIONAL) {
      const professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!professional) throw new NotFoundException('Professional not found')
      doctorProfileId = professional.id
    }

    try {
      const cached = await this.cacheService.get<ScheduleResponseDto>(cacheKey)
      if (cached) {
        if (doctorProfileId !== null && cached.professionalId !== doctorProfileId) {
          throw new ForbiddenException('You are not allowed to view this schedule')
        }
        return cached
      }
    } catch (error) {
      if (error instanceof ForbiddenException) throw error
      this.logger.warn('Cache read failed', { context: FindScheduleByIdUseCase.name })
    }

    const schedule = await this.schedulesRepository.findById(id, clinicId)
    if (!schedule) throw new NotFoundException('Schedule not found')

    if (doctorProfileId !== null && schedule.professionalId !== doctorProfileId) {
      throw new ForbiddenException('You are not allowed to view this schedule')
    }

    const professionalName = await this.fetchProfessionalName(schedule.professionalId)
    const response = this.toResponse(schedule, professionalName)

    try {
      await this.cacheService.set(cacheKey, response, 300)
    } catch {
      this.logger.warn('Cache write failed', { context: FindScheduleByIdUseCase.name })
    }

    return response
  }

  private async fetchProfessionalName(professionalId: string): Promise<string> {
    const rows: Array<{ fullName: string }> = await this.dataSource
      .createQueryBuilder()
      .select('u.full_name', 'fullName')
      .from('professionals', 'd')
      .innerJoin('users', 'u', 'u.id = d.user_id AND u.deleted_at IS NULL')
      .where('d.id = :professionalId', { professionalId })
      .andWhere('d.deleted_at IS NULL')
      .getRawMany()
    return rows[0]?.fullName ?? ''
  }

  private toResponse(schedule: Schedule, professionalName: string): ScheduleResponseDto {
    return {
      id: schedule.id,
      professionalId: schedule.professionalId,
      professionalName,
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
