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
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IAppointmentsRepository } from '../repositories/appointments.repository.adapter'
import { ISchedulesRepository } from '../repositories/schedules.repository.interface'

@Injectable()
export class DeleteScheduleUseCase extends BaseUseCase {
  private readonly logger = new Logger(DeleteScheduleUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly schedulesRepository: ISchedulesRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<void> {
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

    await this.schedulesRepository.delete(id)

    try {
      await this.cacheService.del(`schedule:${clinicId}:${id}`)
      await this.cacheService.delByPrefix(`schedules:list:${clinicId}:`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: DeleteScheduleUseCase.name })
    }
  }

  async deleteByProfessionalId(professionalId: string, clinicId: string, queryRunner?: QueryRunner): Promise<void> {
    await this.schedulesRepository.deleteAllByDoctorId(professionalId, clinicId, queryRunner)

    try {
      await this.cacheService.delByPrefix(`schedules:list:${clinicId}:`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: DeleteScheduleUseCase.name })
    }
  }
}
