import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { ExamRequestResponseDto, UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IAppointmentsRepository } from '../../appointments/repositories/appointments.repository.interface'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { IExamRequestsRepository } from '../repositories/exam-requests.repository.interface'
import { IExamResultsRepository } from '../repositories/exam-results.repository.interface'
import { ExamResult } from '../entities/exam-result.entity'
import { toExamRequestResponse } from './create-exam-request.use-case'

@Injectable()
export class FindExamRequestsByAppointmentUseCase extends BaseUseCase {
  private readonly logger = new Logger(FindExamRequestsByAppointmentUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly examRequestsRepository: IExamRequestsRepository,
    private readonly examResultsRepository: IExamResultsRepository,
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly doctorsRepository: IDoctorsRepository,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(appointmentId: string, currentUser: ICurrentUser): Promise<ExamRequestResponseDto[]> {
    const clinicId = currentUser.clinicId!

    if (currentUser.role === UserRole.DOCTOR) {
      const appointment = await this.appointmentsRepository.findById(appointmentId, clinicId)
      if (!appointment) throw new NotFoundException('Appointment not found')
      const doctor = await this.doctorsRepository.findByUserId(currentUser.id, clinicId)
      if (!doctor || doctor.id !== appointment.doctorId) {
        throw new ForbiddenException('Insufficient permissions')
      }
    }

    const cacheKey = `exam-requests:appointment:${appointmentId}`

    try {
      const cached = await this.cacheService.get<ExamRequestResponseDto[]>(cacheKey)
      if (cached) return cached
    } catch {
      this.logger.warn('Cache read failed', { context: FindExamRequestsByAppointmentUseCase.name })
    }

    const examRequests = await this.examRequestsRepository.findByAppointment(appointmentId, clinicId)

    const results = await this.examResultsRepository.findByExamRequestIds(
      examRequests.map((examRequest) => examRequest.id),
      clinicId,
    )
    const resultsByExamRequestId = new Map<string, ExamResult[]>()
    for (const examResult of results) {
      const list = resultsByExamRequestId.get(examResult.examRequestId) ?? []
      list.push(examResult)
      resultsByExamRequestId.set(examResult.examRequestId, list)
    }

    const response = examRequests.map((examRequest) =>
      toExamRequestResponse(examRequest, resultsByExamRequestId.get(examRequest.id) ?? []),
    )

    try {
      await this.cacheService.set(cacheKey, response, 60)
    } catch {
      this.logger.warn('Cache write failed', { context: FindExamRequestsByAppointmentUseCase.name })
    }

    return response
  }
}
