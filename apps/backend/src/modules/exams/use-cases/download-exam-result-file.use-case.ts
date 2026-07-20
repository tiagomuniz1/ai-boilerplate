import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { IStorageAdapter } from '../../../common/adapters/storage.adapter.interface'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { IExamRequestsRepository } from '../repositories/exam-requests.repository.interface'
import { IExamResultsRepository } from '../repositories/exam-results.repository.interface'

export interface ExamResultFile {
  buffer: Buffer
  fileName: string
  mimeType: string
}

@Injectable()
export class DownloadExamResultFileUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly examResultsRepository: IExamResultsRepository,
    private readonly examRequestsRepository: IExamRequestsRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly storageAdapter: IStorageAdapter,
  ) {
    super(dataSource)
  }

  async execute(resultId: string, currentUser: ICurrentUser): Promise<ExamResultFile> {
    const clinicId = currentUser.clinicId!

    const examResult = await this.examResultsRepository.findById(resultId, clinicId)
    if (!examResult) throw new NotFoundException('Exam result not found')

    const examRequest = await this.examRequestsRepository.findById(examResult.examRequestId, clinicId)
    if (!examRequest) throw new NotFoundException('Exam request not found')

    if (currentUser.role === UserRole.DOCTOR) {
      const doctor = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
      if (!doctor || doctor.id !== examRequest.doctorId) {
        throw new ForbiddenException('Insufficient permissions')
      }
    }

    const buffer = await this.storageAdapter.download(examResult.filePath)

    return { buffer, fileName: examResult.fileName, mimeType: examResult.mimeType }
  }
}
