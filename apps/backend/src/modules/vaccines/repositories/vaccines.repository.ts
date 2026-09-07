import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { QueryRunner, Repository } from 'typeorm'
import { Vaccine } from '../entities/vaccine.entity'
import {
  CreateVaccineData,
  IVaccinesRepository,
  UpdateVaccineData,
} from './vaccines.repository.interface'

@Injectable()
export class VaccinesRepository implements IVaccinesRepository {
  constructor(
    @InjectRepository(Vaccine)
    private readonly repository: Repository<Vaccine>,
  ) {}

  async findAll(
    page: number,
    limit: number,
    search: string | undefined,
    includeInactive: boolean,
  ): Promise<[Vaccine[], number]> {
    const qb = this.repository
      .createQueryBuilder('vaccine')
      .where('vaccine.deleted_at IS NULL')
      .orderBy('vaccine.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)

    if (!includeInactive) qb.andWhere('vaccine.is_active = true')

    const term = search?.trim()
    if (term) {
      // Dezenas de linhas: ILIKE simples resolve. Medicamentos precisam de GIN
      // trigrama porque são 36 mil.
      qb.andWhere(
        '(vaccine.name ILIKE :term OR vaccine.abbreviation ILIKE :term OR vaccine.prevented_diseases ILIKE :term)',
        { term: `%${term}%` },
      )
    }

    return qb.getManyAndCount()
  }

  async findById(id: string): Promise<Vaccine | null> {
    return this.repository.findOneBy({ id })
  }

  async findByName(name: string): Promise<Vaccine | null> {
    return this.repository
      .createQueryBuilder('vaccine')
      .where('lower(vaccine.name) = lower(:name)', { name })
      .andWhere('vaccine.deleted_at IS NULL')
      .getOne()
  }

  async create(data: CreateVaccineData, queryRunner?: QueryRunner): Promise<Vaccine> {
    const repository = queryRunner ? queryRunner.manager.getRepository(Vaccine) : this.repository
    return repository.save(repository.create(data))
  }

  async update(id: string, data: UpdateVaccineData, queryRunner?: QueryRunner): Promise<Vaccine> {
    const repository = queryRunner ? queryRunner.manager.getRepository(Vaccine) : this.repository
    await repository.update(id, data)
    return repository.findOneByOrFail({ id })
  }

  async delete(id: string, queryRunner?: QueryRunner): Promise<void> {
    const repository = queryRunner ? queryRunner.manager.getRepository(Vaccine) : this.repository
    await repository.softDelete(id)
  }
}
