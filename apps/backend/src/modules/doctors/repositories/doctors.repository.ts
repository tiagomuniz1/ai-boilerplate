import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { QueryRunner, Repository } from 'typeorm'
import { UpdateDoctorDto } from '@app/shared'
import { Doctor } from '../entities/doctor.entity'
import { DoctorCrm } from '../entities/doctor-crm.entity'
import { DoctorSpecialty } from '../entities/doctor-specialty.entity'
import {
  CreateDoctorData,
  DoctorCrmAssignment,
  DoctorSpecialtyAssignment,
  IDoctorsRepository,
} from './doctors.repository.interface'

const DOCTOR_RELATIONS = ['user', 'crms', 'doctorSpecialties', 'doctorSpecialties.specialty']

@Injectable()
export class DoctorsRepository implements IDoctorsRepository {
  constructor(
    @InjectRepository(Doctor)
    private readonly repository: Repository<Doctor>,
  ) {}

  async findAll(page: number, limit: number, clinicId: string, search?: string): Promise<[Doctor[], number]> {
    const qb = this.repository
      .createQueryBuilder('doctor')
      .innerJoinAndSelect('doctor.user', 'user')
      .leftJoinAndSelect('doctor.crms', 'crm')
      .leftJoinAndSelect('doctor.doctorSpecialties', 'doctorSpecialty')
      .leftJoinAndSelect('doctorSpecialty.specialty', 'specialty')
      .where('user.clinicId = :clinicId', { clinicId })
      .orderBy('doctor.createdAt', 'DESC')
      .take(limit)
      .skip((page - 1) * limit)

    if (search) {
      qb.andWhere('user.fullName ILIKE :search OR specialty.name ILIKE :search', {
        search: `%${search}%`,
      })
    }

    return qb.getManyAndCount()
  }

  async findById(id: string, clinicId: string): Promise<Doctor | null> {
    return this.repository
      .createQueryBuilder('doctor')
      .innerJoinAndSelect('doctor.user', 'user')
      .leftJoinAndSelect('doctor.crms', 'crm')
      .leftJoinAndSelect('doctor.doctorSpecialties', 'doctorSpecialty')
      .leftJoinAndSelect('doctorSpecialty.specialty', 'specialty')
      .where('doctor.id = :id', { id })
      .andWhere('user.clinicId = :clinicId', { clinicId })
      .getOne()
  }

  async findByUserId(userId: string, clinicId: string): Promise<Doctor | null> {
    return this.repository
      .createQueryBuilder('doctor')
      .innerJoinAndSelect('doctor.user', 'user')
      .leftJoinAndSelect('doctor.crms', 'crm')
      .leftJoinAndSelect('doctor.doctorSpecialties', 'doctorSpecialty')
      .leftJoinAndSelect('doctorSpecialty.specialty', 'specialty')
      .where('doctor.userId = :userId', { userId })
      .andWhere('user.clinicId = :clinicId', { clinicId })
      .getOne()
  }

  async findByCrm(number: string, state: string, clinicId: string): Promise<Doctor | null> {
    return this.repository
      .createQueryBuilder('doctor')
      .innerJoin('doctor.crms', 'crm')
      .where('crm.number = :number', { number })
      .andWhere('crm.state = :state', { state })
      .andWhere('crm.clinicId = :clinicId', { clinicId })
      .andWhere('crm.deletedAt IS NULL')
      .getOne()
  }

  async create(
    data: CreateDoctorData,
    clinicId: string,
    crms: DoctorCrmAssignment[],
    specialties: DoctorSpecialtyAssignment[],
    queryRunner?: QueryRunner,
  ): Promise<Doctor> {
    const manager = queryRunner ? queryRunner.manager : this.repository.manager
    const repo = manager.getRepository(Doctor)
    const crmRepo = manager.getRepository(DoctorCrm)
    const doctorSpecialtyRepo = manager.getRepository(DoctorSpecialty)

    const doctor = repo.create({
      userId: data.userId,
      clinicId,
      bio: data.bio ?? null,
    })
    doctor.crms = crms.map((crm) =>
      crmRepo.create({ clinicId, number: crm.number, state: crm.state, isPrimary: crm.isPrimary }),
    )
    doctor.doctorSpecialties = specialties.map((assignment) =>
      doctorSpecialtyRepo.create({ specialtyId: assignment.specialty.id, rqe: assignment.rqe }),
    )

    const saved = await repo.save(doctor)
    return repo.findOne({ where: { id: saved.id }, relations: DOCTOR_RELATIONS }) as Promise<Doctor>
  }

  async update(
    id: string,
    data: UpdateDoctorDto,
    crms: DoctorCrmAssignment[] | null,
    specialties: DoctorSpecialtyAssignment[] | null,
    queryRunner?: QueryRunner,
  ): Promise<Doctor> {
    const manager = queryRunner ? queryRunner.manager : this.repository.manager
    const repo = manager.getRepository(Doctor)
    const crmRepo = manager.getRepository(DoctorCrm)
    const doctorSpecialtyRepo = manager.getRepository(DoctorSpecialty)

    const doctor = await repo.findOne({ where: { id }, relations: ['crms', 'doctorSpecialties'] })
    if (!doctor) throw new Error(`Doctor ${id} not found`)

    if (data.bio !== undefined) doctor.bio = data.bio
    await repo.save(doctor)

    if (crms !== null) {
      await crmRepo.delete({ doctorId: id })
      await crmRepo.save(
        crms.map((crm) =>
          crmRepo.create({ doctorId: id, clinicId: doctor.clinicId, number: crm.number, state: crm.state, isPrimary: crm.isPrimary }),
        ),
      )
    }
    if (specialties !== null) {
      await doctorSpecialtyRepo.delete({ doctorId: id })
      await doctorSpecialtyRepo.save(
        specialties.map((assignment) =>
          doctorSpecialtyRepo.create({ doctorId: id, specialtyId: assignment.specialty.id, rqe: assignment.rqe }),
        ),
      )
    }

    return repo.findOne({ where: { id }, relations: DOCTOR_RELATIONS }) as Promise<Doctor>
  }

  async delete(id: string, queryRunner?: QueryRunner): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repository.manager
    await manager.getRepository(DoctorCrm).softDelete({ doctorId: id })
    await manager.getRepository(Doctor).softDelete(id)
  }
}
