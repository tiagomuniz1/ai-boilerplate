import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, QueryRunner, Repository } from 'typeorm'
import { AppointmentStatus } from '@app/shared'
import { ListAppointmentsQueryDto } from '../dto/list-appointments-query.dto'
import { Appointment } from '../entities/appointment.entity'
import {
  CreateAppointmentData,
  IAppointmentsRepository,
  UpdateAppointmentData,
} from './appointments.repository.interface'

/**
 * The statuses of an appointment that is still going to happen. They hold the
 * slot — the partial unique index UQ_appointment_slot_active must stay in sync
 * with this list — and they are also what makes an appointment count as
 * "future" when guarding a deletion.
 */
const ACTIVE_STATUSES = [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED]

@Injectable()
export class AppointmentsRepository implements IAppointmentsRepository {
  constructor(
    @InjectRepository(Appointment)
    private readonly repository: Repository<Appointment>,
  ) {}

  async findAll(filters: ListAppointmentsQueryDto, clinicId: string): Promise<[Appointment[], number]> {
    const { professionalId, patientId, status, from, to, page = 1, limit = 20 } = filters

    const qb = this.repository
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.series', 'series')
      .where('appointment.deleted_at IS NULL')
      .andWhere('appointment.clinic_id = :clinicId', { clinicId })
      .orderBy('appointment.date', 'DESC')
      .addOrderBy('appointment.startTime', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)

    if (professionalId) qb.andWhere('appointment.professional_id = :professionalId', { professionalId })
    if (patientId) qb.andWhere('appointment.patient_id = :patientId', { patientId })
    if (status) qb.andWhere('appointment.status = :status', { status })
    if (from) qb.andWhere('appointment.date >= :from', { from })
    if (to) qb.andWhere('appointment.date <= :to', { to })

    return qb.getManyAndCount()
  }

  async findById(id: string, clinicId: string): Promise<Appointment | null> {
    // series is optional, so LEFT JOIN — it carries createdOccurrenceCount,
    // which every response needs for "session N of M".
    return this.repository.findOne({
      where: { id, clinicId },
      relations: ['series'],
    })
  }

  async findActiveByProfessionalAndDate(professionalId: string, date: string, clinicId: string): Promise<Appointment[]> {
    return this.repository.find({
      where: { professionalId, date, clinicId, status: In(ACTIVE_STATUSES) },
    })
  }

  async findActiveBySlot(
    professionalId: string,
    date: string,
    startTime: string,
    clinicId: string,
    queryRunner?: QueryRunner,
  ): Promise<Appointment | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(Appointment) : this.repository
    return repo.findOne({
      where: { professionalId, date, startTime, clinicId, status: In(ACTIVE_STATUSES) },
    })
  }

  /**
   * Batch counterpart of findActiveBySlot for a whole recurring series. Every
   * occurrence shares the same startTime, so a single IN over the dates is
   * enough — no tuple matching needed.
   */
  async findActiveByDatesAndTime(
    professionalId: string,
    clinicId: string,
    dates: string[],
    startTime: string,
    queryRunner?: QueryRunner,
  ): Promise<Appointment[]> {
    if (dates.length === 0) return []
    const repo = queryRunner ? queryRunner.manager.getRepository(Appointment) : this.repository
    return repo.find({
      where: {
        professionalId,
        clinicId,
        startTime,
        date: In(dates),
        status: In(ACTIVE_STATUSES),
      },
      order: { date: 'ASC' },
    })
  }

  async findBySeriesId(seriesId: string, clinicId: string): Promise<Appointment[]> {
    return this.repository.find({
      where: { seriesId, clinicId },
      relations: ['series'],
      order: { date: 'ASC' },
    })
  }

  async findBySeriesIdFromDate(
    seriesId: string,
    clinicId: string,
    fromDate: string,
    statuses: AppointmentStatus[],
    queryRunner?: QueryRunner,
  ): Promise<Appointment[]> {
    const repo = queryRunner ? queryRunner.manager.getRepository(Appointment) : this.repository
    return repo
      .createQueryBuilder('appointment')
      .where('appointment.series_id = :seriesId', { seriesId })
      .andWhere('appointment.clinic_id = :clinicId', { clinicId })
      .andWhere('appointment.date >= :fromDate', { fromDate })
      .andWhere('appointment.status IN (:...statuses)', { statuses })
      .andWhere('appointment.deleted_at IS NULL')
      .orderBy('appointment.date', 'ASC')
      .getMany()
  }

  async countBySeriesIdAfterDate(
    seriesId: string,
    clinicId: string,
    afterDate: string,
    statuses: AppointmentStatus[],
  ): Promise<number> {
    return this.repository
      .createQueryBuilder('appointment')
      .where('appointment.series_id = :seriesId', { seriesId })
      .andWhere('appointment.clinic_id = :clinicId', { clinicId })
      .andWhere('appointment.date > :afterDate', { afterDate })
      .andWhere('appointment.status IN (:...statuses)', { statuses })
      .andWhere('appointment.deleted_at IS NULL')
      .getCount()
  }

  async hasFutureByScheduleId(scheduleId: string, clinicId: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0]
    const count = await this.repository.count({
      where: { scheduleId, clinicId, status: In(ACTIVE_STATUSES) },
    })
    if (count === 0) return false

    const result = await this.repository
      .createQueryBuilder('appointment')
      .where('appointment.schedule_id = :scheduleId', { scheduleId })
      .andWhere('appointment.clinic_id = :clinicId', { clinicId })
      .andWhere('appointment.status IN (:...activeStatuses)', { activeStatuses: ACTIVE_STATUSES })
      .andWhere('appointment.date >= :today', { today })
      .andWhere('appointment.deleted_at IS NULL')
      .getCount()

    return result > 0
  }

  // Any still-active appointment dated today or later for this professional —
  // used to block deleting a professional who would otherwise leave orphaned
  // future consultations behind (there is no reassign/reschedule flow). A
  // confirmed appointment is more reason to block the deletion, not less.
  async hasFutureByProfessionalId(professionalId: string, clinicId: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0]
    const result = await this.repository
      .createQueryBuilder('appointment')
      .where('appointment.professional_id = :professionalId', { professionalId })
      .andWhere('appointment.clinic_id = :clinicId', { clinicId })
      .andWhere('appointment.status IN (:...activeStatuses)', { activeStatuses: ACTIVE_STATUSES })
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
        professionalId: data.professionalId,
        patientId: data.patientId,
        specialtyId: data.specialtyId,
        scheduleId: data.scheduleId,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        reason: data.reason,
        insuranceType: data.insuranceType ?? null,
        seriesId: data.seriesId ?? null,
        seriesSequence: data.seriesSequence ?? null,
        status: AppointmentStatus.SCHEDULED,
      }),
    )
  }

  async update(id: string, data: UpdateAppointmentData, queryRunner?: QueryRunner): Promise<Appointment> {
    const repo = queryRunner ? queryRunner.manager.getRepository(Appointment) : this.repository
    const appointment = await repo.findOneByOrFail({ id })

    if (data.status !== undefined) appointment.status = data.status
    if (data.cancellationReason !== undefined) appointment.cancellationReason = data.cancellationReason
    if (data.professionalId !== undefined) appointment.professionalId = data.professionalId
    if (data.scheduleId !== undefined) appointment.scheduleId = data.scheduleId
    if (data.endTime !== undefined) appointment.endTime = data.endTime

    return repo.save(appointment)
  }
}
