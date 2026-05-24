import { Injectable } from '@nestjs/common'

export abstract class IAppointmentsRepository {
  abstract hasFutureAppointmentsByScheduleId(scheduleId: string): Promise<boolean>
}

@Injectable()
export class AppointmentsRepositoryStub extends IAppointmentsRepository {
  async hasFutureAppointmentsByScheduleId(_scheduleId: string): Promise<boolean> {
    return false
  }
}
