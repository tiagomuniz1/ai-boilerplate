import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { FindScheduledAppointmentsInWindowUseCase, IConflictingAppointment } from '../../appointments/use-cases/find-scheduled-appointments-in-window.use-case'

export abstract class IAppointmentsRepository {
  abstract findScheduledAppointmentsInWindow(
    professionalId: string,
    date: string,
    startTime: string | null,
    endTime: string | null,
    clinicId: string,
  ): Promise<IConflictingAppointment[]>
}

@Injectable()
export class AppointmentsRepositoryAdapter extends IAppointmentsRepository {
  constructor(
    @Inject(forwardRef(/* istanbul ignore next */ () => FindScheduledAppointmentsInWindowUseCase))
    private readonly findInWindowUseCase: FindScheduledAppointmentsInWindowUseCase,
  ) {
    super()
  }

  findScheduledAppointmentsInWindow(
    professionalId: string,
    date: string,
    startTime: string | null,
    endTime: string | null,
    clinicId: string,
  ): Promise<IConflictingAppointment[]> {
    return this.findInWindowUseCase.execute(professionalId, date, startTime, endTime, clinicId)
  }
}
