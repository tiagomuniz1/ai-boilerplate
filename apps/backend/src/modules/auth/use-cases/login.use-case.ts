import { Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { randomUUID } from 'crypto'
import { DataSource } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { IUsersRepository } from '../../users/repositories/users.repository.interface'
import { LoginDto } from '../dto/login.dto'
import { LoginResponseDto } from '../dto/login-response.dto'
import { IRefreshTokensRepository } from '../repositories/refresh-tokens.repository.interface'
import { AUTH_ENV, IAuthEnv, parseTtlToSeconds } from './auth-env.token'

interface LoginResult {
  user: LoginResponseDto
  accessToken: string
  refreshToken: string
  accessTokenMaxAge: number
  refreshTokenMaxAge: number
}

@Injectable()
export class LoginUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly usersRepository: IUsersRepository,
    private readonly refreshTokensRepository: IRefreshTokensRepository,
    private readonly jwtService: JwtService,
    @Inject(AUTH_ENV) private readonly authEnv: IAuthEnv,
  ) {
    super(dataSource)
  }

  async execute(dto: LoginDto): Promise<LoginResult> {
    const user = await this.usersRepository.findByEmail(dto.email)

    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password)
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const accessExpiresInSeconds = parseTtlToSeconds(this.authEnv.jwtExpiration)
    const refreshExpiresInSeconds = parseTtlToSeconds(this.authEnv.jwtRefreshExpiration)

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: user.id, email: user.email },
        { expiresIn: this.authEnv.jwtExpiration },
      ),
      this.jwtService.signAsync(
        { sub: user.id, type: 'refresh', jti: randomUUID() },
        { expiresIn: this.authEnv.jwtRefreshExpiration },
      ),
    ])

    const expiresAt = new Date(Date.now() + refreshExpiresInSeconds * 1000)
    await this.refreshTokensRepository.create(user.id, refreshToken, expiresAt)

    return {
      user: { id: user.id, fullName: user.fullName, email: user.email },
      accessToken,
      refreshToken,
      accessTokenMaxAge: accessExpiresInSeconds * 1000,
      refreshTokenMaxAge: refreshExpiresInSeconds * 1000,
    }
  }
}
