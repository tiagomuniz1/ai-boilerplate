import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { QueryRunner, Repository } from 'typeorm'
import { ListScheduleExceptionsQueryDto } from '../dto/list-schedule-exceptions-query.dto'
import { ScheduleException } from '../entities/schedule-exception.entity'
import { IScheduleExceptionsRepository } from './schedule-exceptions.repository.interface'

@Injectable()
export class ScheduleExceptionsRepository implements IScheduleExceptionsRepository {
  constructor(
    @InjectRepository(ScheduleException)
    private readonly repository: Repository<ScheduleException>,
  ) {}

  async findAll(filters: ListScheduleExceptionsQueryDto, clinicId: string): Promise<[ScheduleException[], number]> {
    const { professionalId, from, to, page = 1, limit = 20 } = filters

    const qb = this.repository
      .createQueryBuilder('exception')
      .where('exception.deleted_at IS NULL')
      .andWhere('exception.clinic_id = :clinicId', { clinicId })
      .orderBy('exception.date', 'ASC')
      .addOrderBy('exception.start_time', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)

    if (professionalId) qb.andWhere('exception.professional_id = :professionalId', { professionalId })
    if (from) qb.andWhere('exception.date >= :from', { from })
    if (to) qb.andWhere('exception.date <= :to', { to })

    return qb.getManyAndCount()
  }

  async findById(id: string, clinicId: string): Promise<ScheduleException | null> {
    return this.repository.findOne({ where: { id, clinicId } })
  }

  async findActiveByProfessionalAndDate(professionalId: string, date: string, clinicId: string): Promise<ScheduleException[]> {
    return this.repository.find({ where: { professionalId, date, clinicId } })
  }

  async create(data: Partial<ScheduleException>, queryRunner?: QueryRunner): Promise<ScheduleException> {
    const repo = queryRunner ? queryRunner.manager.getRepository(ScheduleException) : this.repository
    return repo.save(repo.create(data))
  }

  async update(id: string, data: Partial<ScheduleException>, queryRunner?: QueryRunner): Promise<ScheduleException> {
    const repo = queryRunner ? queryRunner.manager.getRepository(ScheduleException) : this.repository
    const exception = await repo.findOneByOrFail({ id })

    const mutable = exception as unknown as Record<string, unknown>
    const updates = data as unknown as Record<string, unknown>
    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined) {
        mutable[key] = updates[key]
      }
    })

    return repo.save(exception)
  }

  async delete(id: string, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(ScheduleException) : this.repository
    await repo.softDelete(id)
  }
}
