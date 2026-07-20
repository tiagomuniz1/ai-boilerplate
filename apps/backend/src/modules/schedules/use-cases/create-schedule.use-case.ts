import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { DataSource } from 'typeorm'
import { CreateScheduleDto, ScheduleResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { ISchedulesRepository } from '../repositories/schedules.repository.interface'
import { Schedule } from '../entities/schedule.entity'

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

@Injectable()
export class CreateScheduleUseCase extends BaseUseCase {
  private readonly logger = new Logger(CreateScheduleUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly schedulesRepository: ISchedulesRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(dto: CreateScheduleDto, currentUser: ICurrentUser): Promise<ScheduleResponseDto> {
    if (currentUser.role !== UserRole.PROFESSIONAL && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only doctors and admins can create schedules')
    }

    const clinicId = currentUser.clinicId!

    let professional
    if (currentUser.role === UserRole.PROFESSIONAL) {
      professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
    } else {
      if (!dto.professionalId) {
        throw new UnprocessableEntityException('professionalId is required for admin')
      }
      professional = await this.professionalsRepository.findById(dto.professionalId, clinicId)
    }
    if (!professional) throw new NotFoundException('Professional not found')

    const professionalId = professional.id

    const { startTime, endTime, slotDurationInMinutes, validFrom, validUntil } = dto

    if (validFrom && validUntil && validFrom >= validUntil) {
      throw new UnprocessableEntityException('validFrom must be before validUntil')
    }

    if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
      throw new UnprocessableEntityException('startTime must be before endTime')
    }

    const intervalMinutes = timeToMinutes(endTime) - timeToMinutes(startTime)
    if (intervalMinutes % slotDurationInMinutes !== 0) {
      throw new UnprocessableEntityException('Interval must be divisible by slot duration')
    }

    const overlapping = await this.schedulesRepository.findOverlapping(
      professionalId,
      dto.dayOfWeek,
      startTime,
      endTime,
      validFrom ?? null,
      validUntil ?? null,
      clinicId,
    )
    if (overlapping) throw new ConflictException('Schedule overlaps with an existing one')

    const schedule = await this.schedulesRepository.create({ ...dto, professionalId })

    const professionalName = await this.fetchProfessionalName(professionalId)

    try {
      await this.cacheService.delByPrefix(`schedules:list:${clinicId}:`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: CreateScheduleUseCase.name })
    }

    return this.toResponse(schedule, professionalName)
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
