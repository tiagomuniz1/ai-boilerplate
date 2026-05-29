import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { DataSource, QueryRunner } from 'typeorm'
import { UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { IAppointmentsRepository } from '../repositories/appointments.repository.stub'
import { ISchedulesRepository } from '../repositories/schedules.repository.interface'

@Injectable()
export class DeleteScheduleUseCase extends BaseUseCase {
  private readonly logger = new Logger(DeleteScheduleUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly schedulesRepository: ISchedulesRepository,
    private readonly doctorsRepository: IDoctorsRepository,
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<void> {
    const schedule = await this.schedulesRepository.findById(id)
    if (!schedule) throw new NotFoundException('Schedule not found')

    if (currentUser.role !== UserRole.ADMIN) {
      if (currentUser.role !== UserRole.DOCTOR) {
        throw new ForbiddenException('Only doctors and admins can manage schedules')
      }
      const doctor = await this.doctorsRepository.findByUserId(currentUser.id)
      if (!doctor) throw new NotFoundException('Doctor not found')
      if (schedule.doctorId !== doctor.id) {
        throw new ForbiddenException('You are not allowed to manage this schedule')
      }
    }

    const hasFuture = await this.appointmentsRepository.hasFutureAppointmentsByScheduleId(id)
    if (hasFuture) {
      throw new ConflictException('Schedule has future appointments and cannot be modified')
    }

    await this.schedulesRepository.delete(id)

    try {
      await Promise.all([
        this.cacheService.delByPrefix(`schedules:list:${schedule.doctorId}:`),
        this.cacheService.delByPrefix('schedules:list:all:'),
      ])
    } catch {
      this.logger.warn('Cache invalidation failed', { context: DeleteScheduleUseCase.name })
    }
  }

  async deleteByDoctorId(doctorId: string, queryRunner?: QueryRunner): Promise<void> {
    await this.schedulesRepository.deleteAllByDoctorId(doctorId, queryRunner)

    try {
      await Promise.all([
        this.cacheService.delByPrefix(`schedules:list:${doctorId}:`),
        this.cacheService.delByPrefix('schedules:list:all:'),
      ])
    } catch {
      this.logger.warn('Cache invalidation failed', { context: DeleteScheduleUseCase.name })
    }
  }
}
