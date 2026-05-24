import { QueryRunner } from 'typeorm'
import { CreateScheduleDto, DayOfWeek, UpdateScheduleDto } from '@app/shared'
import { ListSchedulesQueryDto } from '../dto/list-schedules-query.dto'
import { Schedule } from '../entities/schedule.entity'

export abstract class ISchedulesRepository {
  abstract findAll(filters: ListSchedulesQueryDto): Promise<[Schedule[], number]>
  abstract findById(id: string): Promise<Schedule | null>
  abstract findOverlapping(
    doctorId: string,
    dayOfWeek: DayOfWeek,
    startTime: string,
    endTime: string,
    validFrom: string | null,
    validUntil: string | null,
    excludeId?: string,
  ): Promise<Schedule | null>
  abstract create(data: CreateScheduleDto & { doctorId: string }, queryRunner?: QueryRunner): Promise<Schedule>
  abstract update(id: string, data: UpdateScheduleDto, queryRunner?: QueryRunner): Promise<Schedule>
  abstract delete(id: string, queryRunner?: QueryRunner): Promise<void>
}
