import { QueryRunner } from 'typeorm'
import { RefreshToken } from '../entities/refresh-token.entity'

export abstract class IRefreshTokensRepository {
  abstract create(
    userId: string,
    token: string,
    expiresAt: Date,
    queryRunner?: QueryRunner,
  ): Promise<RefreshToken>
  abstract findByToken(token: string): Promise<RefreshToken | null>
  abstract revokeByToken(token: string, queryRunner?: QueryRunner): Promise<void>
  abstract revokeAllByUserId(userId: string, queryRunner?: QueryRunner): Promise<void>
}
