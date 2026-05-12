import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { ILike, QueryRunner, Repository } from 'typeorm'
import { CreateDoctorDto, UpdateDoctorDto } from '@app/shared'
import { Doctor } from '../entities/doctor.entity'
import { IDoctorsRepository } from './doctors.repository.interface'

@Injectable()
export class DoctorsRepository implements IDoctorsRepository {
  constructor(
    @InjectRepository(Doctor)
    private readonly repository: Repository<Doctor>,
  ) {}

  async findAll(page: number, limit: number, search?: string): Promise<[Doctor[], number]> {
    const where = search
      ? [
          { user: { fullName: ILike(`%${search}%`) } },
          { specialty: ILike(`%${search}%`) },
        ]
      : {}

    return this.repository.findAndCount({
      relations: ['user'],
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    })
  }

  async findById(id: string): Promise<Doctor | null> {
    return this.repository.findOne({ where: { id }, relations: ['user'] })
  }

  async findByUserId(userId: string): Promise<Doctor | null> {
    return this.repository.findOneBy({ userId })
  }

  async findByCrmNumber(crmNumber: string): Promise<Doctor | null> {
    return this.repository.findOneBy({ crmNumber })
  }

  async create(data: CreateDoctorDto, queryRunner?: QueryRunner): Promise<Doctor> {
    const manager = queryRunner ? queryRunner.manager : this.repository.manager
    const repo = manager.getRepository(Doctor)
    const saved = await repo.save(repo.create(data))
    return this.repository.findOne({ where: { id: saved.id }, relations: ['user'] }) as Promise<Doctor>
  }

  async update(id: string, data: UpdateDoctorDto, queryRunner?: QueryRunner): Promise<Doctor> {
    const manager = queryRunner ? queryRunner.manager : this.repository.manager
    const repo = manager.getRepository(Doctor)
    const doctor = await repo.findOneByOrFail({ id })
    Object.assign(doctor, data)
    const saved = await repo.save(doctor)
    return this.repository.findOne({ where: { id: saved.id }, relations: ['user'] }) as Promise<Doctor>
  }

  async delete(id: string, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(Doctor) : this.repository
    await repo.softDelete(id)
  }
}
