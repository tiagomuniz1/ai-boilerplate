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
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
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
    private readonly doctorsRepository: IDoctorsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(dto: CreateScheduleDto, currentUser: ICurrentUser): Promise<ScheduleResponseDto> {
    if (currentUser.role !== UserRole.DOCTOR && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only doctors and admins can create schedules')
    }

    let doctor
    if (currentUser.role === UserRole.DOCTOR) {
      doctor = await this.doctorsRepository.findByUserId(currentUser.id)
    } else {
      if (!dto.doctorId) {
        throw new UnprocessableEntityException('doctorId is required for admin')
      }
      doctor = await this.doctorsRepository.findById(dto.doctorId)
    }
    if (!doctor) throw new NotFoundException('Doctor not found')

    const doctorId = doctor.id

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
      doctorId,
      dto.dayOfWeek,
      startTime,
      endTime,
      validFrom ?? null,
      validUntil ?? null,
    )
    if (overlapping) throw new ConflictException('Schedule overlaps with an existing one')

    const schedule = await this.schedulesRepository.create({ ...dto, doctorId })

    const doctorName = await this.fetchDoctorName(doctorId)

    try {
      await this.cacheService.delByPrefix(`schedules:list:${doctorId}:`)
      await this.cacheService.delByPrefix('schedules:list:all:')
    } catch {
      this.logger.warn('Cache invalidation failed', { context: CreateScheduleUseCase.name })
    }

    return this.toResponse(schedule, doctorName)
  }

  private async fetchDoctorName(doctorId: string): Promise<string> {
    const rows: Array<{ fullName: string }> = await this.dataSource
      .createQueryBuilder()
      .select('u.full_name', 'fullName')
      .from('doctors', 'd')
      .innerJoin('users', 'u', 'u.id = d.user_id AND u.deleted_at IS NULL')
      .where('d.id = :doctorId', { doctorId })
      .andWhere('d.deleted_at IS NULL')
      .getRawMany()
    return rows[0]?.fullName ?? ''
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
