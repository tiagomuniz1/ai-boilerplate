import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { QueryRunner, Repository } from 'typeorm'
import { AccessRequest } from '../entities/access-request.entity'
import { CreateAccessRequestData, IAccessRequestsRepository } from './access-requests.repository.interface'

@Injectable()
export class AccessRequestsRepository implements IAccessRequestsRepository {
  constructor(
    @InjectRepository(AccessRequest)
    private readonly repository: Repository<AccessRequest>,
  ) {}

  async create(data: CreateAccessRequestData, queryRunner?: QueryRunner): Promise<AccessRequest> {
    const repo = queryRunner ? queryRunner.manager.getRepository(AccessRequest) : this.repository
    return repo.save(repo.create(data))
  }
}
