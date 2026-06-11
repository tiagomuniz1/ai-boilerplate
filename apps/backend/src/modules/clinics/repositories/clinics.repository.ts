import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { ILike, QueryRunner, Repository } from 'typeorm'
import { UpdateClinicDto } from '@app/shared'
import { Clinic } from '../entities/clinic.entity'
import { IClinicsRepository, IClinicCreateData } from './clinics.repository.interface'

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

  async create(data: IClinicCreateData, queryRunner?: QueryRunner): Promise<Clinic> {
    const repo = queryRunner ? queryRunner.manager.getRepository(Clinic) : this.repository
    const entity = repo.create({
      name: data.name,
      slug: data.slug,
      ...(data.address && {
        addressStreet: data.address.street,
        addressNumber: data.address.number,
        addressComplement: data.address.complement ?? null,
        addressNeighborhood: data.address.neighborhood,
        addressCity: data.address.city,
        addressState: data.address.state,
        addressZipCode: data.address.zipCode,
        addressCountry: data.address.country,
      }),
    })
    return repo.save(entity)
  }

  async update(id: string, data: UpdateClinicDto): Promise<Clinic> {
    const clinic = await this.repository.findOneByOrFail({ id })

    const { address, ...rest } = data
    Object.assign(clinic, rest)

    if (address) {
      clinic.addressStreet = address.street
      clinic.addressNumber = address.number
      clinic.addressComplement = address.complement ?? null
      clinic.addressNeighborhood = address.neighborhood
      clinic.addressCity = address.city
      clinic.addressState = address.state
      clinic.addressZipCode = address.zipCode
      clinic.addressCountry = address.country
    }

    if ('themeId' in data) {
      clinic.themeId = data.themeId ?? null
    }

    return this.repository.save(clinic)
  }
}
