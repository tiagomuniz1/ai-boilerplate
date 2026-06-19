import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { DayOfWeek } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { Schedule } from '../entities/schedule.entity'
import { ISchedulesRepository } from '../repositories/schedules.repository.interface'

const UTC_DAY_TO_DAY_OF_WEEK: Record<number, DayOfWeek> = {
  0: DayOfWeek.SUNDAY,
  1: DayOfWeek.MONDAY,
  2: DayOfWeek.TUESDAY,
  3: DayOfWeek.WEDNESDAY,
  4: DayOfWeek.THURSDAY,
  5: DayOfWeek.FRIDAY,
  6: DayOfWeek.SATURDAY,
}

@Injectable()
export class GetActiveSchedulesForDoctorUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly schedulesRepository: ISchedulesRepository,
  ) {
    super(dataSource)
  }

  async execute(doctorId: string, clinicId: string, date: string): Promise<Schedule[]> {
    const utcDay = new Date(`${date}T00:00:00Z`).getUTCDay()
    const dayOfWeek = UTC_DAY_TO_DAY_OF_WEEK[utcDay]
    return this.schedulesRepository.findActiveByDoctorAndDate(doctorId, dayOfWeek, date, clinicId)
  }
}
