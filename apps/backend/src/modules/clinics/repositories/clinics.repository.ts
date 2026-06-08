import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { ILike, QueryRunner, Repository } from 'typeorm'
import { UpdateClinicDto } from '@app/shared'
import { Clinic } from '../entities/clinic.entity'
import { IClinicsRepository } from './clinics.repository.interface'

@Injectable()
export class ClinicsRepository implements IClinicsRepository {
  constructor(
    @InjectRepository(Clinic)
    private readonly repository: Repository<Clinic>,
  ) {}

  async findAll(page: number, limit: number, search?: string): Promise<[Clinic[], number]> {
    if (search) {
      return this.repository
        .createQueryBuilder('clinic')
        .where('clinic.name ILIKE :search OR clinic.slug ILIKE :search', { search: `%${search}%` })
        .orderBy('clinic.createdAt', 'DESC')
        .take(limit)
        .skip((page - 1) * limit)
        .getManyAndCount()
    }

    return this.repository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    })
  }

  async findById(id: string): Promise<Clinic | null> {
    return this.repository.findOneBy({ id })
  }

  async findBySlug(slug: string): Promise<Clinic | null> {
    return this.repository.findOneBy({ slug: ILike(slug) })
  }

  async create(data: { name: string; slug: string }, queryRunner?: QueryRunner): Promise<Clinic> {
    const repo = queryRunner ? queryRunner.manager.getRepository(Clinic) : this.repository
    return repo.save(repo.create(data))
  }

  async update(id: string, data: UpdateClinicDto): Promise<Clinic> {
    const clinic = await this.repository.findOneByOrFail({ id })
    Object.assign(clinic, data)
    return this.repository.save(clinic)
  }
}
