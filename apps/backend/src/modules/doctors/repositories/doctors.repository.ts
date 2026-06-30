import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { QueryRunner, Repository } from 'typeorm'
import { CreateDoctorDto, UpdateDoctorDto } from '@app/shared'
import { Doctor } from '../entities/doctor.entity'
import { Specialty } from '../../specialties/entities/specialty.entity'
import { IDoctorsRepository } from './doctors.repository.interface'

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
      .leftJoinAndSelect('doctor.specialties', 'specialty')
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
      .leftJoinAndSelect('doctor.specialties', 'specialty')
      .where('doctor.id = :id', { id })
      .andWhere('user.clinicId = :clinicId', { clinicId })
      .getOne()
  }

  async findByUserId(userId: string, clinicId: string): Promise<Doctor | null> {
    return this.repository
      .createQueryBuilder('doctor')
      .innerJoinAndSelect('doctor.user', 'user')
      .leftJoinAndSelect('doctor.specialties', 'specialty')
      .where('doctor.userId = :userId', { userId })
      .andWhere('user.clinicId = :clinicId', { clinicId })
      .getOne()
  }

  async findByCrmNumber(crmNumber: string, clinicId: string): Promise<Doctor | null> {
    return this.repository
      .createQueryBuilder('doctor')
      .innerJoin('doctor.user', 'user')
      .where('doctor.crmNumber = :crmNumber', { crmNumber })
      .andWhere('user.clinicId = :clinicId', { clinicId })
      .getOne()
  }

  async create(data: CreateDoctorDto & { userId: string }, clinicId: string, specialties: Specialty[], queryRunner?: QueryRunner): Promise<Doctor> {
    const manager = queryRunner ? queryRunner.manager : this.repository.manager
    const repo = manager.getRepository(Doctor)
    const doctor = repo.create({
      userId: data.userId,
      clinicId,
      crmNumber: data.crmNumber,
      bio: data.bio,
    })
    doctor.specialties = specialties
    const saved = await repo.save(doctor)
    return repo.findOne({ where: { id: saved.id }, relations: ['user', 'specialties'] }) as Promise<Doctor>
  }

  async update(id: string, data: UpdateDoctorDto, specialties: Specialty[] | null, queryRunner?: QueryRunner): Promise<Doctor> {
    const manager = queryRunner ? queryRunner.manager : this.repository.manager
    const repo = manager.getRepository(Doctor)
    const doctor = await repo.findOne({ where: { id }, relations: ['specialties'] })
    if (!doctor) throw new Error(`Doctor ${id} not found`)
    if (data.crmNumber !== undefined) doctor.crmNumber = data.crmNumber
    if (data.bio !== undefined) doctor.bio = data.bio
    if (specialties !== null) doctor.specialties = specialties
    const saved = await repo.save(doctor)
    return repo.findOne({ where: { id: saved.id }, relations: ['user', 'specialties'] }) as Promise<Doctor>
  }

  async delete(id: string, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(Doctor) : this.repository
    await repo.softDelete(id)
  }
}
