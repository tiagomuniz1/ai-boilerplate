import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { DataSource, OptimisticLockVersionMismatchError } from 'typeorm'
import { ScheduleResponseDto, UpdateScheduleDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IAppointmentsRepository } from '../repositories/appointments.repository.adapter'
import { ISchedulesRepository } from '../repositories/schedules.repository.interface'
import { Schedule } from '../entities/schedule.entity'

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

@Injectable()
export class UpdateScheduleUseCase extends BaseUseCase {
  private readonly logger = new Logger(UpdateScheduleUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly schedulesRepository: ISchedulesRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(
    id: string,
    dto: UpdateScheduleDto,
    currentUser: ICurrentUser,
  ): Promise<ScheduleResponseDto> {
    const clinicId = currentUser.clinicId!

    const schedule = await this.schedulesRepository.findById(id, clinicId)
    if (!schedule) throw new NotFoundException('Schedule not found')

    if (currentUser.role !== UserRole.ADMIN) {
      if (currentUser.role !== UserRole.PROFESSIONAL) {
        throw new ForbiddenException('Only doctors and admins can manage schedules')
      }
      const professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!professional) throw new NotFoundException('Professional not found')
      if (schedule.professionalId !== professional.id) {
        throw new ForbiddenException('You are not allowed to manage this schedule')
      }
    }

    const hasFuture = await this.appointmentsRepository.hasFutureAppointmentsByScheduleId(id, clinicId)
    if (hasFuture) {
      throw new ConflictException('Schedule has future appointments and cannot be modified')
    }

    const merged = {
      dayOfWeek: dto.dayOfWeek !== undefined ? dto.dayOfWeek : schedule.dayOfWeek,
      startTime: dto.startTime !== undefined ? dto.startTime : schedule.startTime,
      endTime: dto.endTime !== undefined ? dto.endTime : schedule.endTime,
      slotDurationInMinutes:
        dto.slotDurationInMinutes !== undefined
          ? dto.slotDurationInMinutes
          : schedule.slotDurationInMinutes,
      validFrom: dto.validFrom !== undefined ? dto.validFrom : schedule.validFrom,
      validUntil: dto.validUntil !== undefined ? dto.validUntil : schedule.validUntil,
    }

    if (timeToMinutes(merged.startTime) >= timeToMinutes(merged.endTime)) {
      throw new UnprocessableEntityException('startTime must be before endTime')
    }

    const intervalMinutes = timeToMinutes(merged.endTime) - timeToMinutes(merged.startTime)
    if (intervalMinutes % merged.slotDurationInMinutes !== 0) {
      throw new UnprocessableEntityException('Interval must be divisible by slot duration')
    }

    if (merged.validFrom !== null && merged.validUntil !== null && merged.validFrom >= merged.validUntil) {
      throw new UnprocessableEntityException('validFrom must be before validUntil')
    }

    const timeOrValidityChanged =
      merged.dayOfWeek !== schedule.dayOfWeek ||
      merged.startTime !== schedule.startTime ||
      merged.endTime !== schedule.endTime ||
      merged.validFrom !== schedule.validFrom ||
      merged.validUntil !== schedule.validUntil

    if (timeOrValidityChanged) {
      const overlapping = await this.schedulesRepository.findOverlapping(
        schedule.professionalId,
        merged.dayOfWeek,
        merged.startTime,
        merged.endTime,
        merged.validFrom,
        merged.validUntil,
        clinicId,
        id,
      )
      if (overlapping) throw new ConflictException('Schedule overlaps with an existing one')
    }

    let updated: Schedule
    try {
      updated = await this.schedulesRepository.update(id, dto)
    } catch (error) {
      if (error instanceof OptimisticLockVersionMismatchError) {
        throw new ConflictException('Record was modified by another process. Please try again.')
      }
      throw error
    }

    try {
      await this.cacheService.del(`schedule:${clinicId}:${id}`)
      await this.cacheService.delByPrefix(`schedules:list:${clinicId}:`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: UpdateScheduleUseCase.name })
    }

    const professionalName = await this.fetchProfessionalName(updated.professionalId)
    return this.toResponse(updated, professionalName)
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
