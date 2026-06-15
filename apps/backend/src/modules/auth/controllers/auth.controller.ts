import { Body, Controller, Get, Headers, HttpCode, Post, Req, Res, UnauthorizedException } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { Request, Response } from 'express'
import { Public } from '../decorators/public.decorator'
import { CurrentUser } from '../decorators/current-user.decorator'
import { LoginDto } from '../dto/login.dto'
import { LoginResponseDto } from '../dto/login-response.dto'
import { MeResponseDto } from '../dto/me-response.dto'
import { LoginUseCase } from '../use-cases/login.use-case'
import { LogoutUseCase } from '../use-cases/logout.use-case'
import { MeUseCase } from '../use-cases/me.use-case'
import { RefreshTokenUseCase } from '../use-cases/refresh-token.use-case'
import { ICurrentUser } from '../types/current-user.type'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly meUseCase: MeUseCase,
  ) {}

  private cookieNames(slug?: string | null): { access: string; refresh: string } {
    const suffix = slug && slug !== 'backoffice' ? `_${slug}` : ''
    return { access: `access_token${suffix}`, refresh: `refresh_token${suffix}` }
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
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'strict' as const,
      path: '/',
    }

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

    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'strict' as const,
      path: '/',
    }

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

    const cookieOptions = { httpOnly: true, secure: true, sameSite: 'strict' as const, path: '/' }
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
}
