import { Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { randomUUID } from 'crypto'
import { DataSource } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { IUsersRepository } from '../../users/repositories/users.repository.interface'
import { AuthResponseDto } from '../dto/auth-response.dto'
import { LoginDto } from '../dto/login.dto'
import { IRefreshTokensRepository } from '../repositories/refresh-tokens.repository.interface'
import { AUTH_ENV, IAuthEnv, parseTtlToSeconds } from './auth-env.token'

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

  async execute(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersRepository.findByEmail(dto.email)

    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password)
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const accessExpiresIn = parseTtlToSeconds(this.authEnv.jwtExpiration)
    const refreshExpiresIn = parseTtlToSeconds(this.authEnv.jwtRefreshExpiration)

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

    const expiresAt = new Date(Date.now() + refreshExpiresIn * 1000)

    await this.runInTransaction(async (queryRunner) => {
      await this.refreshTokensRepository.create(user.id, refreshToken, expiresAt, queryRunner)
    })

    return { accessToken, refreshToken, expiresIn: accessExpiresIn }
  }
}
