import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { LogoutDto } from '../dto/logout.dto'
import { IRefreshTokensRepository } from '../repositories/refresh-tokens.repository.interface'

@Injectable()
export class LogoutUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly refreshTokensRepository: IRefreshTokensRepository,
  ) {
    super(dataSource)
  }

  async execute(dto: LogoutDto): Promise<void> {
    const storedToken = await this.refreshTokensRepository.findByToken(dto.refreshToken)

    if (!storedToken || storedToken.revokedAt !== null) {
      return
    }

    await this.runInTransaction(async (queryRunner) => {
      await this.refreshTokensRepository.revokeByToken(dto.refreshToken, queryRunner)
    })
  }
}
