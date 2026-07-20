import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IScheduleExceptionsRepository } from '../repositories/schedule-exceptions.repository.interface'

@Injectable()
export class DeleteScheduleExceptionUseCase extends BaseUseCase {
  private readonly logger = new Logger(DeleteScheduleExceptionUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly scheduleExceptionsRepository: IScheduleExceptionsRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<void> {
    const clinicId = currentUser.clinicId!

    const exception = await this.scheduleExceptionsRepository.findById(id, clinicId)
    if (!exception) throw new NotFoundException('Schedule exception not found')

    if (currentUser.role === UserRole.PROFESSIONAL) {
      const professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!professional || exception.professionalId !== professional.id) {
        throw new ForbiddenException('You are not allowed to manage this schedule exception')
      }
    }

    await this.scheduleExceptionsRepository.delete(id)

    try {
      await this.cacheService.delByPrefix(`schedule-exceptions:list:${clinicId}:${exception.professionalId}:`)
      await this.cacheService.delByPrefix(`schedule-exceptions:list:${clinicId}:all:`)
      await this.cacheService.del(`appointments:availability:${clinicId}:${exception.professionalId}:${exception.date}`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: DeleteScheduleExceptionUseCase.name })
    }
  }
}
