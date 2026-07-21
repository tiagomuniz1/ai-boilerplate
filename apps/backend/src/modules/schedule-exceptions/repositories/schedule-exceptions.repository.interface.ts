import { QueryRunner } from 'typeorm'
import { ListScheduleExceptionsQueryDto } from '../dto/list-schedule-exceptions-query.dto'
import { ScheduleException } from '../entities/schedule-exception.entity'

export abstract class IScheduleExceptionsRepository {
  abstract findAll(filters: ListScheduleExceptionsQueryDto, clinicId: string): Promise<[ScheduleException[], number]>
  abstract findById(id: string, clinicId: string): Promise<ScheduleException | null>
  abstract findActiveByProfessionalAndDate(professionalId: string, date: string, clinicId: string): Promise<ScheduleException[]>
  abstract create(data: Partial<ScheduleException>, queryRunner?: QueryRunner): Promise<ScheduleException>
  abstract update(id: string, data: Partial<ScheduleException>, queryRunner?: QueryRunner): Promise<ScheduleException>
  abstract delete(id: string, queryRunner?: QueryRunner): Promise<void>
}
