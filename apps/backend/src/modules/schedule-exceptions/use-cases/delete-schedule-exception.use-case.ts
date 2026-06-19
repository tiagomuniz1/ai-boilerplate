import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { IScheduleExceptionsRepository } from '../repositories/schedule-exceptions.repository.interface'

@Injectable()
export class DeleteScheduleExceptionUseCase extends BaseUseCase {
  private readonly logger = new Logger(DeleteScheduleExceptionUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly scheduleExceptionsRepository: IScheduleExceptionsRepository,
    private readonly doctorsRepository: IDoctorsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<void> {
    const clinicId = currentUser.clinicId!

    const exception = await this.scheduleExceptionsRepository.findById(id, clinicId)
    if (!exception) throw new NotFoundException('Schedule exception not found')

    if (currentUser.role === UserRole.DOCTOR) {
      const doctor = await this.doctorsRepository.findByUserId(currentUser.id, clinicId)
      if (!doctor || exception.doctorId !== doctor.id) {
        throw new ForbiddenException('You are not allowed to manage this schedule exception')
      }
    }

    await this.scheduleExceptionsRepository.delete(id)

    try {
      await this.cacheService.delByPrefix(`schedule-exceptions:list:${clinicId}:${exception.doctorId}:`)
      await this.cacheService.delByPrefix(`schedule-exceptions:list:${clinicId}:all:`)
      await this.cacheService.del(`appointments:availability:${clinicId}:${exception.doctorId}:${exception.date}`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: DeleteScheduleExceptionUseCase.name })
    }
  }
}
