import { Injectable } from '@nestjs/common'
import { createHash } from 'crypto'
import { DataSource } from 'typeorm'
import { ValidateSetPasswordTokenResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { IUsersRepository } from '../../users/repositories/users.repository.interface'
import { IPasswordSetTokensRepository } from '../repositories/password-set-tokens.repository.interface'

@Injectable()
export class ValidateSetPasswordTokenUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly passwordSetTokensRepository: IPasswordSetTokensRepository,
    private readonly usersRepository: IUsersRepository,
  ) {
    super(dataSource)
  }

  async execute(token: string): Promise<ValidateSetPasswordTokenResponseDto> {
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const record = await this.passwordSetTokensRepository.findByTokenHash(tokenHash)

    if (!record || record.usedAt !== null || record.expiresAt < new Date()) {
      return { valid: false, email: null }
    }

    const user = await this.usersRepository.findById(record.userId, record.clinicId)
    if (!user) {
      return { valid: false, email: null }
    }

    return { valid: true, email: user.email }
  }
}
