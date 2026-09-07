import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { QueryRunner, Repository } from 'typeorm'
import { VaccineScheduleRule } from '../entities/vaccine-schedule-rule.entity'
import {
  CreateRuleData,
  IVaccineScheduleRulesRepository,
  UpdateRuleData,
} from './vaccine-schedule-rules.repository.interface'

@Injectable()
export class VaccineScheduleRulesRepository implements IVaccineScheduleRulesRepository {
  constructor(
    @InjectRepository(VaccineScheduleRule)
    private readonly repository: Repository<VaccineScheduleRule>,
  ) {}

  private base() {
    return this.repository
      .createQueryBuilder('rule')
      .innerJoinAndSelect('rule.vaccine', 'vaccine')
      .orderBy('vaccine.name', 'ASC')
      .addOrderBy('rule.doseOrder', 'ASC')
  }

  async findAll(vaccineId?: string): Promise<VaccineScheduleRule[]> {
    const qb = this.base()
    if (vaccineId) qb.andWhere('rule.vaccineId = :vaccineId', { vaccineId })
    return qb.getMany()
  }

  /**
   * Só regras ativas de vacinas ativas: uma regra viva apontando para vacina
   * desativada faria o motor cobrar dose de algo que saiu do catálogo.
   */
  async findAllActive(): Promise<VaccineScheduleRule[]> {
    return this.base()
      .andWhere('rule.isActive = true')
      .andWhere('vaccine.isActive = true')
      .getMany()
  }

  async findById(id: string): Promise<VaccineScheduleRule | null> {
    return this.base().andWhere('rule.id = :id', { id }).getOne()
  }

  async findByVaccineAndOrder(vaccineId: string, doseOrder: number): Promise<VaccineScheduleRule | null> {
    return this.repository
      .createQueryBuilder('rule')
      .where('rule.vaccineId = :vaccineId', { vaccineId })
      .andWhere('rule.doseOrder = :doseOrder', { doseOrder })
      .getOne()
  }

  async create(data: CreateRuleData, queryRunner?: QueryRunner): Promise<VaccineScheduleRule> {
    const repo = queryRunner ? queryRunner.manager.getRepository(VaccineScheduleRule) : this.repository
    const saved = await repo.save(repo.create(data))
    return this.findById(saved.id) as Promise<VaccineScheduleRule>
  }

  async update(id: string, data: UpdateRuleData, queryRunner?: QueryRunner): Promise<VaccineScheduleRule> {
    const repo = queryRunner ? queryRunner.manager.getRepository(VaccineScheduleRule) : this.repository
    await repo.update(id, data)
    return this.findById(id) as Promise<VaccineScheduleRule>
  }

  async delete(id: string, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(VaccineScheduleRule) : this.repository
    await repo.softDelete(id)
  }
}
