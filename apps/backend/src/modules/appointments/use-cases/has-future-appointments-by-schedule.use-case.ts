import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { IAppointmentsRepository } from '../repositories/appointments.repository.interface'

@Injectable()
export class HasFutureAppointmentsByScheduleUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly appointmentsRepository: IAppointmentsRepository,
  ) {
    super(dataSource)
  }

  async execute(scheduleId: string, clinicId: string): Promise<boolean> {
    return this.appointmentsRepository.hasFutureByScheduleId(scheduleId, clinicId)
  }
}
