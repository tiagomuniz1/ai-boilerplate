import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { createHash } from 'crypto'
import { QueryRunner, Repository } from 'typeorm'
import { RefreshToken } from '../entities/refresh-token.entity'
import { IRefreshTokensRepository } from './refresh-tokens.repository.interface'

@Injectable()
export class RefreshTokensRepository implements IRefreshTokensRepository {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly repository: Repository<RefreshToken>,
  ) {}

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }

  async create(
    userId: string,
    token: string,
    expiresAt: Date,
    queryRunner?: QueryRunner,
  ): Promise<RefreshToken> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(RefreshToken)
      : this.repository
    return repo.save(
      repo.create({ userId, tokenHash: this.hash(token), expiresAt, revokedAt: null }),
    )
  }

  async findByToken(token: string): Promise<RefreshToken | null> {
    return this.repository.findOneBy({ tokenHash: this.hash(token) })
  }

  async revokeByToken(token: string, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(RefreshToken)
      : this.repository
    await repo.update({ tokenHash: this.hash(token) }, { revokedAt: new Date() })
  }

  async revokeAllByUserId(userId: string, queryRunner?: QueryRunner): Promise<void> {
    const qb = queryRunner
      ? queryRunner.manager
          .createQueryBuilder()
          .update(RefreshToken)
          .set({ revokedAt: new Date() })
          .where('user_id = :userId AND revoked_at IS NULL', { userId })
      : this.repository
          .createQueryBuilder()
          .update()
          .set({ revokedAt: new Date() })
          .where('user_id = :userId AND revoked_at IS NULL', { userId })
    await qb.execute()
  }
}
