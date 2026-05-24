import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { ScheduleResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { ISchedulesRepository } from '../repositories/schedules.repository.interface'
import { Schedule } from '../entities/schedule.entity'

@Injectable()
export class FindScheduleByIdUseCase extends BaseUseCase {
  private readonly logger = new Logger(FindScheduleByIdUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly schedulesRepository: ISchedulesRepository,
    private readonly doctorsRepository: IDoctorsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<ScheduleResponseDto> {
    const cacheKey = `schedule:${id}`

    let doctorProfileId: string | null = null
    if (currentUser.role === UserRole.DOCTOR) {
      const doctor = await this.doctorsRepository.findByUserId(currentUser.id)
      if (!doctor) throw new NotFoundException('Doctor not found')
      doctorProfileId = doctor.id
    }

    try {
      const cached = await this.cacheService.get<ScheduleResponseDto>(cacheKey)
      if (cached) {
        if (doctorProfileId !== null && cached.doctorId !== doctorProfileId) {
          throw new ForbiddenException('You are not allowed to view this schedule')
        }
        return cached
      }
    } catch (error) {
      if (error instanceof ForbiddenException) throw error
      this.logger.warn('Cache read failed', { context: FindScheduleByIdUseCase.name })
    }

    const schedule = await this.schedulesRepository.findById(id)
    if (!schedule) throw new NotFoundException('Schedule not found')

    if (doctorProfileId !== null && schedule.doctorId !== doctorProfileId) {
      throw new ForbiddenException('You are not allowed to view this schedule')
    }

    const response = this.toResponse(schedule)

    try {
      await this.cacheService.set(cacheKey, response, 300)
    } catch {
      this.logger.warn('Cache write failed', { context: FindScheduleByIdUseCase.name })
    }

    return response
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
