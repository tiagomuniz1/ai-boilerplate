import { Body, Controller, Get, Headers, HttpCode, Post, Query, Req, Res, UnauthorizedException } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { Request, Response } from 'express'
import { SetPasswordDto, ValidateSetPasswordTokenQueryDto, ValidateSetPasswordTokenResponseDto } from '@app/shared'
import { Public } from '../decorators/public.decorator'
import { CurrentUser } from '../decorators/current-user.decorator'
import { LoginDto } from '../dto/login.dto'
import { LoginResponseDto } from '../dto/login-response.dto'
import { MeResponseDto } from '../dto/me-response.dto'
import { LoginUseCase } from '../use-cases/login.use-case'
import { LogoutUseCase } from '../use-cases/logout.use-case'
import { MeUseCase } from '../use-cases/me.use-case'
import { RefreshTokenUseCase } from '../use-cases/refresh-token.use-case'
import { SetPasswordUseCase } from '../use-cases/set-password.use-case'
import { ValidateSetPasswordTokenUseCase } from '../use-cases/validate-set-password-token.use-case'
import { ICurrentUser } from '../types/current-user.type'
import { getEnvConfig } from '../../../config/env.config'

@Controller('auth')
export class AuthController {
  // Empty in dev (host-only cookies on localhost), `.pulso.center` in prod so the
  // cookie is shared between slug.pulso.center (middleware) and api.pulso.center (API).
  private readonly cookieDomain = getEnvConfig().COOKIE_DOMAIN

  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly meUseCase: MeUseCase,
    private readonly validateSetPasswordTokenUseCase: ValidateSetPasswordTokenUseCase,
    private readonly setPasswordUseCase: SetPasswordUseCase,
  ) {}

  private cookieNames(slug?: string | null): { access: string; refresh: string } {
    const suffix = slug && slug !== 'backoffice' ? `_${slug}` : ''
    return { access: `access_token${suffix}`, refresh: `refresh_token${suffix}` }
  }

  // Base attributes for auth cookies. `domain` is added only when COOKIE_DOMAIN is
  // set (prod) — never in dev. Cookie NAMES stay per-slug (see cookieNames) so
  // multiple clinics in the same browser never collide, even sharing a Domain.
  private baseCookieOptions() {
    return {
      httpOnly: true,
      secure: true,
      sameSite: 'strict' as const,
      path: '/',
      ...(this.cookieDomain ? { domain: this.cookieDomain } : {}),
    }
  }

  @Post('login')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponseDto> {
    const { user, accessToken, refreshToken, accessTokenMaxAge, refreshTokenMaxAge } =
      await this.loginUseCase.execute(dto)

    const names = this.cookieNames(dto.slug)
    const cookieOptions = this.baseCookieOptions()

    response.cookie(names.access, accessToken, { ...cookieOptions, maxAge: accessTokenMaxAge })
    response.cookie(names.refresh, refreshToken, { ...cookieOptions, maxAge: refreshTokenMaxAge })

    return user
  }

  @Post('refresh')
  @Public()
  @HttpCode(204)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Headers('x-clinic-slug') slug?: string,
  ): Promise<void> {
    const names = this.cookieNames(slug)
    const refreshToken = req.cookies?.[names.refresh] as string | undefined
    if (!refreshToken) throw new UnauthorizedException('Refresh token not found')

    const { accessToken, refreshToken: newRefreshToken, expiresIn, refreshTokenExpiresIn } =
      await this.refreshTokenUseCase.execute({ refreshToken })

    const cookieOptions = this.baseCookieOptions()

    res.cookie(names.access, accessToken, { ...cookieOptions, maxAge: expiresIn * 1000 })
    res.cookie(names.refresh, newRefreshToken, { ...cookieOptions, maxAge: refreshTokenExpiresIn * 1000 })
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body?: { slug?: string },
  ): Promise<void> {
    const names = this.cookieNames(body?.slug)
    const refreshToken = req.cookies?.[names.refresh] as string | undefined

    const cookieOptions = this.baseCookieOptions()
    res.clearCookie(names.access, cookieOptions)
    res.clearCookie(names.refresh, cookieOptions)

    if (refreshToken) {
      await this.logoutUseCase.execute({ refreshToken })
    }
  }

  @Get('me')
  @HttpCode(200)
  me(@CurrentUser() authUser: ICurrentUser): Promise<MeResponseDto> {
    return this.meUseCase.execute(authUser.id, authUser.clinicId)
  }

  @Get('set-password/validate')
  @Public()
  @HttpCode(200)
  validateSetPasswordToken(
    @Query() query: ValidateSetPasswordTokenQueryDto,
  ): Promise<ValidateSetPasswordTokenResponseDto> {
    return this.validateSetPasswordTokenUseCase.execute(query.token)
  }

  @Post('set-password')
  @Public()
  @HttpCode(204)
  setPassword(@Body() dto: SetPasswordDto): Promise<void> {
    return this.setPasswordUseCase.execute(dto)
  }
}
