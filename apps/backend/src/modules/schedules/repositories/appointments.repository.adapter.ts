import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { HasFutureAppointmentsByScheduleUseCase } from '../../appointments/use-cases/has-future-appointments-by-schedule.use-case'

export abstract class IAppointmentsRepository {
  abstract hasFutureAppointmentsByScheduleId(scheduleId: string, clinicId: string): Promise<boolean>
}

@Injectable()
export class AppointmentsRepositoryAdapter extends IAppointmentsRepository {
  constructor(
    @Inject(forwardRef(/* istanbul ignore next */ () => HasFutureAppointmentsByScheduleUseCase))
    private readonly hasFutureUseCase: HasFutureAppointmentsByScheduleUseCase,
  ) {
    super()
  }

  async hasFutureAppointmentsByScheduleId(scheduleId: string, clinicId: string): Promise<boolean> {
    return this.hasFutureUseCase.execute(scheduleId, clinicId)
  }
}
