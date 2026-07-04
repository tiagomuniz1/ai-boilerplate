import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { QueryRunner, Repository } from 'typeorm'
import { ExamRequestStatus } from '@app/shared'
import { ExamRequest } from '../entities/exam-request.entity'
import { CreateExamRequestData, IExamRequestsRepository } from './exam-requests.repository.interface'

@Injectable()
export class ExamRequestsRepository implements IExamRequestsRepository {
  constructor(
    @InjectRepository(ExamRequest)
    private readonly repository: Repository<ExamRequest>,
  ) {}

  async findByAppointment(appointmentId: string, clinicId: string): Promise<ExamRequest[]> {
    return this.repository.find({
      where: { appointmentId, clinicId },
      order: { issuedAt: 'DESC' },
    })
  }

  async findById(id: string, clinicId: string): Promise<ExamRequest | null> {
    return this.repository.findOne({ where: { id, clinicId } })
  }

  async create(data: CreateExamRequestData, queryRunner?: QueryRunner): Promise<ExamRequest> {
    const repo = queryRunner ? queryRunner.manager.getRepository(ExamRequest) : this.repository
    return repo.save(repo.create(data))
  }

  async updateStatus(id: string, status: ExamRequestStatus, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(ExamRequest) : this.repository
    await repo.update(id, { status })
  }

  async delete(id: string, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(ExamRequest) : this.repository
    await repo.softDelete(id)
  }
}
