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

  async findAll(page: number, limit: number, search?: string): Promise<[Doctor[], number]> {
    const qb = this.repository
      .createQueryBuilder('doctor')
      .innerJoinAndSelect('doctor.user', 'user')
      .leftJoinAndSelect('doctor.specialties', 'specialty')
      .orderBy('doctor.createdAt', 'DESC')
      .take(limit)
      .skip((page - 1) * limit)

    if (search) {
      qb.where('user.fullName ILIKE :search OR specialty.name ILIKE :search', {
        search: `%${search}%`,
      })
    }

    return qb.getManyAndCount()
  }

  async findById(id: string): Promise<Doctor | null> {
    return this.repository
      .createQueryBuilder('doctor')
      .innerJoinAndSelect('doctor.user', 'user')
      .leftJoinAndSelect('doctor.specialties', 'specialty')
      .where('doctor.id = :id', { id })
      .getOne()
  }

  async findByUserId(userId: string): Promise<Doctor | null> {
    return this.repository
      .createQueryBuilder('doctor')
      .innerJoinAndSelect('doctor.user', 'user')
      .leftJoinAndSelect('doctor.specialties', 'specialty')
      .where('doctor.userId = :userId', { userId })
      .getOne()
  }

  async findByCrmNumber(crmNumber: string): Promise<Doctor | null> {
    return this.repository.findOneBy({ crmNumber })
  }

  async create(data: CreateDoctorDto, specialties: Specialty[], queryRunner?: QueryRunner): Promise<Doctor> {
    const manager = queryRunner ? queryRunner.manager : this.repository.manager
    const repo = manager.getRepository(Doctor)
    const doctor = repo.create({ userId: data.userId, crmNumber: data.crmNumber, bio: data.bio })
    doctor.specialties = specialties
    const saved = await repo.save(doctor)
    return this.repository.findOne({ where: { id: saved.id }, relations: ['user', 'specialties'] }) as Promise<Doctor>
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
    return this.repository.findOne({ where: { id: saved.id }, relations: ['user', 'specialties'] }) as Promise<Doctor>
  }

  async delete(id: string, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(Doctor) : this.repository
    await repo.softDelete(id)
  }
}
