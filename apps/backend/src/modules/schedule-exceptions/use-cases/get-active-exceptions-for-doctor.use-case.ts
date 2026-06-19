import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { IScheduleExceptionsRepository } from '../repositories/schedule-exceptions.repository.interface'
import { ScheduleException } from '../entities/schedule-exception.entity'

@Injectable()
export class GetActiveExceptionsForDoctorUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly scheduleExceptionsRepository: IScheduleExceptionsRepository,
  ) {
    super(dataSource)
  }

  async execute(doctorId: string, clinicId: string, date: string): Promise<ScheduleException[]> {
    return this.scheduleExceptionsRepository.findActiveByDoctorAndDate(doctorId, date, clinicId)
  }
}
