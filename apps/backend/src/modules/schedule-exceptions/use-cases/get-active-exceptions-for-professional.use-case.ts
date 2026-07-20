import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { IScheduleExceptionsRepository } from '../repositories/schedule-exceptions.repository.interface'
import { ScheduleException } from '../entities/schedule-exception.entity'

@Injectable()
export class GetActiveExceptionsForProfessionalUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly scheduleExceptionsRepository: IScheduleExceptionsRepository,
  ) {
    super(dataSource)
  }

  async execute(professionalId: string, clinicId: string, date: string): Promise<ScheduleException[]> {
    return this.scheduleExceptionsRepository.findActiveByProfessionalAndDate(professionalId, date, clinicId)
  }
}
