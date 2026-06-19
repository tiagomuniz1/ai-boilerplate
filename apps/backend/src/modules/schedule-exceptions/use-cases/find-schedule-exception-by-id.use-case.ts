import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IDoctorsRepository } from '../../doctors/repositories/doctors.repository.interface'
import { IScheduleExceptionsRepository } from '../repositories/schedule-exceptions.repository.interface'
import { ScheduleException } from '../entities/schedule-exception.entity'

@Injectable()
export class FindScheduleExceptionByIdUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly scheduleExceptionsRepository: IScheduleExceptionsRepository,
    private readonly doctorsRepository: IDoctorsRepository,
  ) {
    super(dataSource)
  }

  async execute(id: string, currentUser: ICurrentUser): Promise<ScheduleException> {
    const clinicId = currentUser.clinicId!

    const exception = await this.scheduleExceptionsRepository.findById(id, clinicId)
    if (!exception) throw new NotFoundException('Schedule exception not found')

    if (currentUser.role === UserRole.DOCTOR) {
      const doctor = await this.doctorsRepository.findByUserId(currentUser.id, clinicId)
      if (!doctor || exception.doctorId !== doctor.id) {
        throw new ForbiddenException('You are not allowed to view this schedule exception')
      }
    }

    return exception
  }
}
