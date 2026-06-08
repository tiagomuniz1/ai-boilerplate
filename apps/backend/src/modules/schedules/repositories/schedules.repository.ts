import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { QueryRunner, Repository } from 'typeorm'
import { CreateScheduleDto, DayOfWeek, UpdateScheduleDto } from '@app/shared'
import { Schedule } from '../entities/schedule.entity'
import { ISchedulesRepository } from './schedules.repository.interface'
import { ListSchedulesQueryDto } from '../dto/list-schedules-query.dto'

@Injectable()
export class SchedulesRepository implements ISchedulesRepository {
  constructor(
    @InjectRepository(Schedule)
    private readonly repository: Repository<Schedule>,
  ) {}

  async findAll(filters: ListSchedulesQueryDto, clinicId: string): Promise<[Schedule[], number]> {
    const { doctorId, dayOfWeek, activeOn, page = 1, limit = 20 } = filters

    const qb = this.repository
      .createQueryBuilder('schedule')
      .innerJoin('doctors', 'd', 'd.id = schedule.doctor_id AND d.deleted_at IS NULL')
      .innerJoin('users', 'u', 'u.id = d.user_id AND u.deleted_at IS NULL')
      .where('schedule.deleted_at IS NULL')
      .andWhere('u.clinic_id = :clinicId', { clinicId })
      .orderBy('schedule.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)

    if (activeOn) {
      qb.andWhere(
        '(schedule.valid_from IS NULL OR schedule.valid_from <= :activeOn)',
        { activeOn },
      )
      qb.andWhere(
        '(schedule.valid_until IS NULL OR schedule.valid_until >= :activeOn)',
        { activeOn },
      )
    }

    if (doctorId) {
      qb.andWhere('schedule.doctor_id = :doctorId', { doctorId })
    }

    if (dayOfWeek) {
      qb.andWhere('schedule.day_of_week = :dayOfWeek', { dayOfWeek })
    }

    return qb.getManyAndCount()
  }

  async findById(id: string, clinicId: string): Promise<Schedule | null> {
    return this.repository
      .createQueryBuilder('schedule')
      .innerJoin('doctors', 'd', 'd.id = schedule.doctor_id AND d.deleted_at IS NULL')
      .innerJoin('users', 'u', 'u.id = d.user_id AND u.deleted_at IS NULL')
      .where('schedule.id = :id', { id })
      .andWhere('u.clinic_id = :clinicId', { clinicId })
      .getOne()
  }

  async findOverlapping(
    doctorId: string,
    dayOfWeek: DayOfWeek,
    startTime: string,
    endTime: string,
    validFrom: string | null,
    validUntil: string | null,
    clinicId: string,
    excludeId?: string,
  ): Promise<Schedule | null> {
    const qb = this.repository
      .createQueryBuilder('schedule')
      .innerJoin('doctors', 'd', 'd.id = schedule.doctor_id AND d.deleted_at IS NULL')
      .innerJoin('users', 'u', 'u.id = d.user_id AND u.deleted_at IS NULL')
      .where('schedule.deleted_at IS NULL')
      .andWhere('u.clinic_id = :clinicId', { clinicId })
      .andWhere('schedule.doctor_id = :doctorId', { doctorId })
      .andWhere('schedule.day_of_week = :dayOfWeek', { dayOfWeek })
      .andWhere('schedule.start_time < :endTime', { endTime })
      .andWhere('schedule.end_time > :startTime', { startTime })

    if (validFrom !== null) {
      qb.andWhere(
        '(schedule.valid_until IS NULL OR schedule.valid_until >= :validFrom)',
        { validFrom },
      )
    }

    if (validUntil !== null) {
      qb.andWhere(
        '(schedule.valid_from IS NULL OR schedule.valid_from <= :validUntil)',
        { validUntil },
      )
    }

    if (excludeId) {
      qb.andWhere('schedule.id != :excludeId', { excludeId })
    }

    return qb.getOne()
  }

  async create(
    data: CreateScheduleDto & { doctorId: string },
    queryRunner?: QueryRunner,
  ): Promise<Schedule> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(Schedule)
      : this.repository
    return repo.save(
      repo.create({
        doctorId: data.doctorId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        slotDurationInMinutes: data.slotDurationInMinutes,
        validFrom: data.validFrom ?? null,
        validUntil: data.validUntil ?? null,
      }),
    )
  }

  async update(id: string, data: UpdateScheduleDto, queryRunner?: QueryRunner): Promise<Schedule> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(Schedule)
      : this.repository
    const schedule = await repo.findOneByOrFail({ id })

    const mutableSchedule = schedule as unknown as Record<string, unknown>
    const mutableData = data as unknown as Record<string, unknown>
    Object.keys(data).forEach((key) => {
      if (mutableData[key] !== undefined) {
        mutableSchedule[key] = mutableData[key]
      }
    })

    return repo.save(schedule)
  }

  async delete(id: string, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(Schedule)
      : this.repository
    await repo.softDelete(id)
  }

  async deleteAllByDoctorId(doctorId: string, _clinicId: string, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(Schedule)
      : this.repository
    await repo.softDelete({ doctorId })
  }
}
