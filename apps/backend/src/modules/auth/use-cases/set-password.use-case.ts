import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { createHash } from 'crypto'
import { DataSource } from 'typeorm'
import { SetPasswordDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { IUsersRepository } from '../../users/repositories/users.repository.interface'
import { IPasswordSetTokensRepository } from '../repositories/password-set-tokens.repository.interface'

@Injectable()
export class SetPasswordUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly passwordSetTokensRepository: IPasswordSetTokensRepository,
    private readonly usersRepository: IUsersRepository,
  ) {
    super(dataSource)
  }

  async execute(dto: SetPasswordDto): Promise<void> {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex')
    const record = await this.passwordSetTokensRepository.findByTokenHash(tokenHash)

    if (!record) throw new NotFoundException('Token not found')
    if (record.usedAt !== null) throw new UnprocessableEntityException('Token already used')
    if (record.expiresAt < new Date()) throw new UnprocessableEntityException('Token expired')

    const hashedPassword = await bcrypt.hash(dto.password, 10)

    await this.runInTransaction(async (queryRunner) => {
      await this.usersRepository.updatePassword(record.userId, hashedPassword, queryRunner)
      await this.passwordSetTokensRepository.markAsUsed(record.id, queryRunner)
    })
  }
}
