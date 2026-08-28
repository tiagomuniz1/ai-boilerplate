import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { QueryRunner, Repository } from 'typeorm'
import { AppointmentSeries } from '../entities/appointment-series.entity'
import {
  CreateAppointmentSeriesData,
  IAppointmentSeriesRepository,
} from './appointment-series.repository.interface'

@Injectable()
export class AppointmentSeriesRepository implements IAppointmentSeriesRepository {
  constructor(
    @InjectRepository(AppointmentSeries)
    private readonly repository: Repository<AppointmentSeries>,
  ) {}

  async create(
    data: CreateAppointmentSeriesData,
    queryRunner?: QueryRunner,
  ): Promise<AppointmentSeries> {
    const repo = queryRunner ? queryRunner.manager.getRepository(AppointmentSeries) : this.repository
    return repo.save(repo.create(data))
  }

  async findById(id: string, clinicId: string): Promise<AppointmentSeries | null> {
    return this.repository.findOne({ where: { id, clinicId } })
  }
}
