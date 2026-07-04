import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { ExamRequestResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { IExamRequestsRepository } from '../repositories/exam-requests.repository.interface'
import { IExamResultsRepository } from '../repositories/exam-results.repository.interface'
import { toExamRequestResponse } from './create-exam-request.use-case'

@Injectable()
export class FindExamRequestByIdUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly examRequestsRepository: IExamRequestsRepository,
    private readonly examResultsRepository: IExamResultsRepository,
    private readonly doctorsRepository: IDoctorsRepository,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<ExamRequestResponseDto> {
    const clinicId = currentUser.clinicId!

    const examRequest = await this.examRequestsRepository.findById(id, clinicId)
    if (!examRequest) throw new NotFoundException('Exam request not found')

    if (currentUser.role === UserRole.DOCTOR) {
      const doctor = await this.doctorsRepository.findByUserId(currentUser.id, clinicId)
      if (!doctor || doctor.id !== examRequest.doctorId) {
        throw new ForbiddenException('Insufficient permissions')
      }
    }

    const results = await this.examResultsRepository.findByExamRequestIds([examRequest.id], clinicId)

    return toExamRequestResponse(examRequest, results)
  }
}
