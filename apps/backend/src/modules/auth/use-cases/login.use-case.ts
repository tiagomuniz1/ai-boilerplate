import { Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { randomUUID } from 'crypto'
import { DataSource } from 'typeorm'
import { UserRole } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { FindClinicBySlugUseCase } from '../../clinics/use-cases/find-clinic-by-slug.use-case'
import { IUsersRepository } from '../../users/repositories/users.repository.interface'
import { ICaptchaAdapter } from '../adapters/captcha.adapter.interface'
import { CAPTCHA_ATTEMPT_WINDOW_SECONDS, CAPTCHA_FAILED_ATTEMPTS_THRESHOLD } from '../constants/captcha.constants'
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
    private readonly findClinicBySlugUseCase: FindClinicBySlugUseCase,
    private readonly cacheService: CacheService,
    private readonly captchaAdapter: ICaptchaAdapter,
  ) {
    super(dataSource)
  }

  async execute(dto: LoginDto): Promise<LoginResult> {
    const scope = !dto.slug || dto.slug === 'backoffice' ? 'backoffice' : dto.slug
    const attemptKey = `login-attempts:${scope}:${dto.email.toLowerCase()}`

    await this.ensureCaptchaIfRequired(attemptKey, dto.captchaToken)

    try {
      const result = await this.authenticate(dto)
      await this.cacheService.del(attemptKey)
      return result
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        await this.registerFailedAttempt(attemptKey, error)
      }
      throw error
    }
  }

  // Captcha is required starting on the 3rd attempt (2 prior failures already
  // recorded). Checked BEFORE credential validation — a missing/invalid token
  // never reaches bcrypt, and never counts as a credential-failure attempt
  // itself (only real credential failures increment the counter below).
  private async ensureCaptchaIfRequired(attemptKey: string, captchaToken?: string): Promise<void> {
    const attempts = (await this.cacheService.get<number>(attemptKey)) ?? 0
    if (attempts < CAPTCHA_FAILED_ATTEMPTS_THRESHOLD) return

    if (!captchaToken) {
      throw new UnauthorizedException({ message: 'Invalid credentials', requiresCaptcha: true })
    }

    const captchaValid = await this.captchaAdapter.verify(captchaToken)
    if (!captchaValid) {
      throw new UnauthorizedException({ message: 'Captcha inválido, tente novamente', requiresCaptcha: true })
    }
  }

  // Increments the failed-attempt counter and, once it crosses the threshold,
  // augments the (already-thrown) error with requiresCaptcha:true — so the
  // response that reports THIS failure already tells the frontend the NEXT
  // attempt needs the widget, without wasting an extra round trip to find out.
  private async registerFailedAttempt(attemptKey: string, error: UnauthorizedException): Promise<never> {
    const newCount = await this.cacheService.increment(attemptKey, CAPTCHA_ATTEMPT_WINDOW_SECONDS)
    if (newCount < CAPTCHA_FAILED_ATTEMPTS_THRESHOLD) {
      throw error
    }

    throw new UnauthorizedException({ message: error.message, requiresCaptcha: true })
  }

  private async authenticate(dto: LoginDto): Promise<LoginResult> {
    const isBackoffice = !dto.slug || dto.slug === 'backoffice'

    let clinicId: string | null = null
    if (!isBackoffice) {
      try {
        const clinic = await this.findClinicBySlugUseCase.execute(dto.slug!)
        clinicId = clinic.id
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw new UnauthorizedException('Invalid credentials')
        }
        throw error
      }
    }

    const user = await this.usersRepository.findByEmail(dto.email, clinicId)

    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password)
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials')
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is not active')
    }

    if (user.role === UserRole.PATIENT) {
      throw new UnauthorizedException('Invalid credentials')
    }

    if (!user.clinicId && user.role !== UserRole.PLATFORM_ADMIN) {
      throw new UnauthorizedException('User is not associated with a clinic')
    }

    const accessExpiresInSeconds = parseTtlToSeconds(this.authEnv.jwtExpiration)
    const refreshExpiresInSeconds = parseTtlToSeconds(this.authEnv.jwtRefreshExpiration)

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: user.id, email: user.email, role: user.role, clinicId: user.clinicId },
        { expiresIn: this.authEnv.jwtExpiration },
      ),
      this.jwtService.signAsync(
        { sub: user.id, type: 'refresh', jti: randomUUID(), clinicId: user.clinicId },
        { expiresIn: this.authEnv.jwtRefreshExpiration },
      ),
    ])

    const expiresAt = new Date(Date.now() + refreshExpiresInSeconds * 1000)
    await this.refreshTokensRepository.create(user.id, refreshToken, expiresAt)

    return {
      user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role, clinicId: user.clinicId },
      accessToken,
      refreshToken,
      accessTokenMaxAge: accessExpiresInSeconds * 1000,
      refreshTokenMaxAge: refreshExpiresInSeconds * 1000,
    }
  }
}
