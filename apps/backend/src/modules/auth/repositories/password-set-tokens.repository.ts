import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { QueryRunner, Repository } from 'typeorm'
import { PasswordSetToken } from '../entities/password-set-token.entity'
import { IPasswordSetTokensRepository } from './password-set-tokens.repository.interface'

@Injectable()
export class PasswordSetTokensRepository implements IPasswordSetTokensRepository {
  constructor(
    @InjectRepository(PasswordSetToken)
    private readonly repository: Repository<PasswordSetToken>,
  ) {}

  async create(data: {
    userId: string
    clinicId: string | null
    tokenHash: string
    expiresAt: Date
  }): Promise<PasswordSetToken> {
    return this.repository.save(this.repository.create({ ...data, usedAt: null }))
  }

  async findByTokenHash(tokenHash: string): Promise<PasswordSetToken | null> {
    return this.repository.findOneBy({ tokenHash })
  }

  async markAsUsed(id: string, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(PasswordSetToken)
      : this.repository
    await repo.update(id, { usedAt: new Date() })
  }
}
