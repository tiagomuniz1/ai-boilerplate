import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { QueryRunner, Repository } from 'typeorm'
import { AppointmentStatus } from '@app/shared'
import { ListAppointmentsQueryDto } from '../dto/list-appointments-query.dto'
import { Appointment } from '../entities/appointment.entity'
import {
  CreateAppointmentData,
  IAppointmentsRepository,
  UpdateAppointmentData,
} from './appointments.repository.interface'

@Injectable()
export class AppointmentsRepository implements IAppointmentsRepository {
  constructor(
    @InjectRepository(Appointment)
    private readonly repository: Repository<Appointment>,
  ) {}

  async findAll(filters: ListAppointmentsQueryDto, clinicId: string): Promise<[Appointment[], number]> {
    const { doctorId, patientId, status, from, to, page = 1, limit = 20 } = filters

    const qb = this.repository
      .createQueryBuilder('appointment')
      .where('appointment.deleted_at IS NULL')
      .andWhere('appointment.clinic_id = :clinicId', { clinicId })
      .orderBy('appointment.date', 'DESC')
      .addOrderBy('appointment.start_time', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)

    if (doctorId) qb.andWhere('appointment.doctor_id = :doctorId', { doctorId })
    if (patientId) qb.andWhere('appointment.patient_id = :patientId', { patientId })
    if (status) qb.andWhere('appointment.status = :status', { status })
    if (from) qb.andWhere('appointment.date >= :from', { from })
    if (to) qb.andWhere('appointment.date <= :to', { to })

    return qb.getManyAndCount()
  }

  async findById(id: string, clinicId: string): Promise<Appointment | null> {
    return this.repository.findOne({
      where: { id, clinicId },
    })
  }

  async findActiveByDoctorAndDate(doctorId: string, date: string, clinicId: string): Promise<Appointment[]> {
    return this.repository.find({
      where: { doctorId, date, clinicId, status: AppointmentStatus.SCHEDULED },
    })
  }

  async findActiveBySlot(
    doctorId: string,
    date: string,
    startTime: string,
    clinicId: string,
    queryRunner?: QueryRunner,
  ): Promise<Appointment | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(Appointment) : this.repository
    return repo.findOne({
      where: { doctorId, date, startTime, clinicId, status: AppointmentStatus.SCHEDULED },
    })
  }

  async hasFutureByScheduleId(scheduleId: string, clinicId: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0]
    const count = await this.repository.count({
      where: { scheduleId, clinicId, status: AppointmentStatus.SCHEDULED },
    })
    if (count === 0) return false

    const result = await this.repository
      .createQueryBuilder('appointment')
      .where('appointment.schedule_id = :scheduleId', { scheduleId })
      .andWhere('appointment.clinic_id = :clinicId', { clinicId })
      .andWhere('appointment.status = :status', { status: AppointmentStatus.SCHEDULED })
      .andWhere('appointment.date >= :today', { today })
      .andWhere('appointment.deleted_at IS NULL')
      .getCount()

    return result > 0
  }

  async create(data: CreateAppointmentData, queryRunner?: QueryRunner): Promise<Appointment> {
    const repo = queryRunner ? queryRunner.manager.getRepository(Appointment) : this.repository
    return repo.save(
      repo.create({
        clinicId: data.clinicId,
        doctorId: data.doctorId,
        patientId: data.patientId,
        scheduleId: data.scheduleId,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        reason: data.reason,
        status: AppointmentStatus.SCHEDULED,
      }),
    )
  }

  async update(id: string, data: UpdateAppointmentData, queryRunner?: QueryRunner): Promise<Appointment> {
    const repo = queryRunner ? queryRunner.manager.getRepository(Appointment) : this.repository
    const appointment = await repo.findOneByOrFail({ id })

    if (data.status !== undefined) appointment.status = data.status
    if (data.cancellationReason !== undefined) appointment.cancellationReason = data.cancellationReason

    return repo.save(appointment)
  }
}
