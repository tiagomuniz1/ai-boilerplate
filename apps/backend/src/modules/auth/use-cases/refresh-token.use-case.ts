import { Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService, TokenExpiredError } from '@nestjs/jwt'
import { randomUUID } from 'crypto'
import { DataSource } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { IUsersRepository } from '../../users/repositories/users.repository.interface'
import { RefreshResponseDto } from '../dto/auth-response.dto'
import { RefreshTokenDto } from '../dto/refresh-token.dto'
import { IRefreshTokensRepository } from '../repositories/refresh-tokens.repository.interface'
import { AUTH_ENV, IAuthEnv, parseTtlToSeconds } from './auth-env.token'

interface RefreshJwtPayload {
  sub: string
  type: string
}

@Injectable()
export class RefreshTokenUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly usersRepository: IUsersRepository,
    private readonly refreshTokensRepository: IRefreshTokensRepository,
    private readonly jwtService: JwtService,
    @Inject(AUTH_ENV) private readonly authEnv: IAuthEnv,
  ) {
    super(dataSource)
  }

  async execute(dto: RefreshTokenDto): Promise<RefreshResponseDto> {
    let payload: RefreshJwtPayload

    try {
      payload = await this.jwtService.verifyAsync<RefreshJwtPayload>(dto.refreshToken, {
        secret: this.authEnv.jwtSecret,
      })
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException('Refresh token expired')
      }
      throw new UnauthorizedException('Invalid refresh token')
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token')
    }

    const storedToken = await this.refreshTokensRepository.findByToken(dto.refreshToken)

    if (!storedToken || storedToken.revokedAt !== null) {
      throw new UnauthorizedException('Invalid refresh token')
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired')
    }

    const user = await this.usersRepository.findById(payload.sub)
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token')
    }

    const accessExpiresIn = parseTtlToSeconds(this.authEnv.jwtExpiration)
    const refreshExpiresIn = parseTtlToSeconds(this.authEnv.jwtRefreshExpiration)

    const [accessToken, newRefreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: user.id, email: user.email },
        { expiresIn: this.authEnv.jwtExpiration },
      ),
      this.jwtService.signAsync(
        { sub: user.id, type: 'refresh', jti: randomUUID() },
        { expiresIn: this.authEnv.jwtRefreshExpiration },
      ),
    ])

    const newExpiresAt = new Date(Date.now() + refreshExpiresIn * 1000)

    await this.runInTransaction(async (queryRunner) => {
      await this.refreshTokensRepository.revokeByToken(dto.refreshToken, queryRunner)
      await this.refreshTokensRepository.create(user.id, newRefreshToken, newExpiresAt, queryRunner)
    })

    return { accessToken, refreshToken: newRefreshToken, expiresIn: accessExpiresIn }
  }
}
