import { QueryRunner } from 'typeorm'
import { PasswordSetToken } from '../entities/password-set-token.entity'

export abstract class IPasswordSetTokensRepository {
  abstract create(data: {
    userId: string
    clinicId: string | null
    tokenHash: string
    expiresAt: Date
  }): Promise<PasswordSetToken>
  abstract findByTokenHash(tokenHash: string): Promise<PasswordSetToken | null>
  abstract markAsUsed(id: string, queryRunner?: QueryRunner): Promise<void>
}
