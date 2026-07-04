import { ForbiddenException, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { DataSource } from 'typeorm'
import { ExamRequestResponseDto, ExamRequestStatus } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { IStorageAdapter } from '../../../common/adapters/storage.adapter.interface'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { IExamRequestsRepository } from '../repositories/exam-requests.repository.interface'
import { IExamResultsRepository } from '../repositories/exam-results.repository.interface'
import { FindExamRequestByIdUseCase } from './find-exam-request-by-id.use-case'

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 10 * 1024 * 1024

const MIME_TO_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

@Injectable()
export class AddExamResultUseCase extends BaseUseCase {
  private readonly logger = new Logger(AddExamResultUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly examRequestsRepository: IExamRequestsRepository,
    private readonly examResultsRepository: IExamResultsRepository,
    private readonly doctorsRepository: IDoctorsRepository,
    private readonly storageAdapter: IStorageAdapter,
    private readonly cacheService: CacheService,
    private readonly findExamRequestByIdUseCase: FindExamRequestByIdUseCase,
  ) {
    super(dataSource)
  }

  async execute(
    examRequestId: string,
    files: Express.Multer.File[],
    currentUser: ICurrentUser,
  ): Promise<ExamRequestResponseDto> {
    const clinicId = currentUser.clinicId!

    const examRequest = await this.examRequestsRepository.findById(examRequestId, clinicId)
    if (!examRequest) throw new NotFoundException('Exam request not found')

    const doctor = await this.doctorsRepository.findByUserId(currentUser.id, clinicId)
    if (!doctor || doctor.id !== examRequest.doctorId) {
      throw new ForbiddenException('Insufficient permissions')
    }

    if (!files || files.length === 0) {
      throw new UnprocessableEntityException('At least one file is required')
    }

    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        throw new UnprocessableEntityException('Invalid file type. Accepted: pdf, jpeg, png, webp')
      }
      if (file.size > MAX_SIZE_BYTES) {
        throw new UnprocessableEntityException('File too large. Maximum size is 10MB')
      }
    }

    const uploads = await Promise.all(
      files.map(async (file) => {
        const resultId = randomUUID()
        const ext = MIME_TO_EXT[file.mimetype]
        const path = `exam-results/${clinicId}/${examRequestId}/${resultId}.${ext}`
        const filePath = await this.storageAdapter.upload(file.buffer, path, file.mimetype, false)
        return { resultId, file, filePath }
      }),
    )

    await this.runInTransaction(async (queryRunner) => {
      for (const upload of uploads) {
        await this.examResultsRepository.create(
          {
            id: upload.resultId,
            clinicId,
            examRequestId,
            filePath: upload.filePath,
            fileName: upload.file.originalname,
            mimeType: upload.file.mimetype,
            fileSizeBytes: upload.file.size,
            uploadedByUserId: currentUser.id,
          },
          queryRunner,
        )
      }

      if (examRequest.status !== ExamRequestStatus.COMPLETED) {
        await this.examRequestsRepository.updateStatus(examRequestId, ExamRequestStatus.COMPLETED, queryRunner)
      }
    })

    try {
      await this.cacheService.del(`exam-requests:appointment:${examRequest.appointmentId}`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: AddExamResultUseCase.name })
    }

    return this.findExamRequestByIdUseCase.execute(examRequestId, currentUser)
  }
}
