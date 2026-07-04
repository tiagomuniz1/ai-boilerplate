import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { ExamRequestStatus } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { IExamRequestsRepository } from '../repositories/exam-requests.repository.interface'
import { IExamResultsRepository } from '../repositories/exam-results.repository.interface'

@Injectable()
export class DeleteExamResultUseCase extends BaseUseCase {
  private readonly logger = new Logger(DeleteExamResultUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly examResultsRepository: IExamResultsRepository,
    private readonly examRequestsRepository: IExamRequestsRepository,
    private readonly doctorsRepository: IDoctorsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(resultId: string, currentUser: ICurrentUser): Promise<void> {
    const clinicId = currentUser.clinicId!

    const examResult = await this.examResultsRepository.findById(resultId, clinicId)
    if (!examResult) throw new NotFoundException('Exam result not found')

    const examRequest = await this.examRequestsRepository.findById(examResult.examRequestId, clinicId)
    if (!examRequest) throw new NotFoundException('Exam request not found')

    const doctor = await this.doctorsRepository.findByUserId(currentUser.id, clinicId)
    if (!doctor || doctor.id !== examRequest.doctorId) {
      throw new ForbiddenException('Insufficient permissions')
    }

    await this.runInTransaction(async (queryRunner) => {
      await this.examResultsRepository.delete(resultId, queryRunner)

      const activeCount = await this.examResultsRepository.countActiveByExamRequest(examRequest.id, queryRunner)
      if (activeCount === 0 && examRequest.status === ExamRequestStatus.COMPLETED) {
        await this.examRequestsRepository.updateStatus(examRequest.id, ExamRequestStatus.REQUESTED, queryRunner)
      }
    })

    try {
      await this.cacheService.del(`exam-requests:appointment:${examRequest.appointmentId}`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: DeleteExamResultUseCase.name })
    }
  }
}
