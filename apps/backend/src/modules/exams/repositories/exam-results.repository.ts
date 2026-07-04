import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, QueryRunner, Repository } from 'typeorm'
import { ExamResult } from '../entities/exam-result.entity'
import { CreateExamResultData, IExamResultsRepository } from './exam-results.repository.interface'

@Injectable()
export class ExamResultsRepository implements IExamResultsRepository {
  constructor(
    @InjectRepository(ExamResult)
    private readonly repository: Repository<ExamResult>,
  ) {}

  async findByExamRequestIds(examRequestIds: string[], clinicId: string): Promise<ExamResult[]> {
    if (examRequestIds.length === 0) return []

    return this.repository.find({
      where: { examRequestId: In(examRequestIds), clinicId },
      order: { createdAt: 'ASC' },
    })
  }

  async findById(id: string, clinicId: string): Promise<ExamResult | null> {
    return this.repository.findOne({ where: { id, clinicId } })
  }

  async countActiveByExamRequest(examRequestId: string, queryRunner?: QueryRunner): Promise<number> {
    const repo = queryRunner ? queryRunner.manager.getRepository(ExamResult) : this.repository
    return repo.count({ where: { examRequestId } })
  }

  async create(data: CreateExamResultData, queryRunner?: QueryRunner): Promise<ExamResult> {
    const repo = queryRunner ? queryRunner.manager.getRepository(ExamResult) : this.repository
    return repo.save(repo.create(data))
  }

  async deleteByExamRequestId(examRequestId: string, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(ExamResult) : this.repository
    await repo.softDelete({ examRequestId })
  }

  async delete(id: string, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(ExamResult) : this.repository
    await repo.softDelete(id)
  }
}
