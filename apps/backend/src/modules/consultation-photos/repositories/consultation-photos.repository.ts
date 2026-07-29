import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { QueryRunner, Repository } from 'typeorm'
import { ConsultationPhoto } from '../entities/consultation-photo.entity'
import {
  ConsultationPhotoWithProfessionalName,
  CreateConsultationPhotoData,
  IConsultationPhotosRepository,
} from './consultation-photos.repository.interface'

@Injectable()
export class ConsultationPhotosRepository implements IConsultationPhotosRepository {
  constructor(
    @InjectRepository(ConsultationPhoto)
    private readonly repository: Repository<ConsultationPhoto>,
  ) {}

  async findByAppointment(appointmentId: string, clinicId: string): Promise<ConsultationPhoto[]> {
    return this.repository.find({
      where: { appointmentId, clinicId },
      order: { createdAt: 'DESC' },
    })
  }

  async findByPatient(
    clinicId: string,
    patientId: string,
    page: number,
    limit: number,
    professionalId?: string,
  ): Promise<[ConsultationPhotoWithProfessionalName[], number]> {
    const baseQuery = this.repository
      .createQueryBuilder('cp')
      .leftJoin('professionals', 'prof', 'prof.id = cp.professional_id')
      .leftJoin('users', 'u', 'u.id = prof.user_id')
      .leftJoin('appointments', 'appt', 'appt.id = cp.appointment_id')
      .where('cp.clinicId = :clinicId', { clinicId })
      .andWhere('cp.patientId = :patientId', { patientId })

    if (professionalId) {
      baseQuery.andWhere('cp.professionalId = :professionalId', { professionalId })
    }

    const total = await baseQuery.getCount()

    const { entities, raw } = await baseQuery
      .addSelect('u.full_name', 'professionalName')
      .addSelect('appt.date', 'appointmentDate')
      .orderBy('cp.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getRawAndEntities()

    const data = entities.map((entity, index) => ({
      ...entity,
      professionalName: raw[index].professionalName,
      appointmentDate: raw[index].appointmentDate,
    }))

    return [data, total]
  }

  async findById(id: string, clinicId: string): Promise<ConsultationPhoto | null> {
    return this.repository.findOne({ where: { id, clinicId } })
  }

  async create(data: CreateConsultationPhotoData, queryRunner?: QueryRunner): Promise<ConsultationPhoto> {
    const repo = queryRunner ? queryRunner.manager.getRepository(ConsultationPhoto) : this.repository
    return repo.save(repo.create(data))
  }

  async delete(id: string, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(ConsultationPhoto) : this.repository
    await repo.softDelete(id)
  }
}
