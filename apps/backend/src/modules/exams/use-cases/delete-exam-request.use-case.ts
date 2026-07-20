import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IExamRequestsRepository } from '../repositories/exam-requests.repository.interface'
import { IExamResultsRepository } from '../repositories/exam-results.repository.interface'

@Injectable()
export class DeleteExamRequestUseCase extends BaseUseCase {
  private readonly logger = new Logger(DeleteExamRequestUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly examRequestsRepository: IExamRequestsRepository,
    private readonly examResultsRepository: IExamResultsRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<void> {
    const clinicId = currentUser.clinicId!

    const examRequest = await this.examRequestsRepository.findById(id, clinicId)
    if (!examRequest) throw new NotFoundException('Exam request not found')

    if (currentUser.role === UserRole.DOCTOR) {
      const doctor = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!doctor || doctor.id !== examRequest.doctorId) {
        throw new ForbiddenException('Insufficient permissions')
      }
    }

    await this.runInTransaction(async (queryRunner) => {
      await this.examResultsRepository.deleteByExamRequestId(id, queryRunner)
      await this.examRequestsRepository.delete(id, queryRunner)
    })

    try {
      await this.cacheService.del(`exam-requests:appointment:${examRequest.appointmentId}`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: DeleteExamRequestUseCase.name })
    }
  }
}
