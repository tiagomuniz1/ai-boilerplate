import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { Response } from 'express'
import { Public } from '../decorators/public.decorator'
import { CurrentUser } from '../decorators/current-user.decorator'
import { RefreshResponseDto } from '../dto/auth-response.dto'
import { LoginDto } from '../dto/login.dto'
import { LoginResponseDto } from '../dto/login-response.dto'
import { LogoutDto } from '../dto/logout.dto'
import { MeResponseDto } from '../dto/me-response.dto'
import { RefreshTokenDto } from '../dto/refresh-token.dto'
import { LoginUseCase } from '../use-cases/login.use-case'
import { LogoutUseCase } from '../use-cases/logout.use-case'
import { MeUseCase } from '../use-cases/me.use-case'
import { RefreshTokenUseCase } from '../use-cases/refresh-token.use-case'
import { AuthenticatedUser } from '../strategies/jwt.strategy'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly meUseCase: MeUseCase,
  ) {}

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

    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'strict' as const,
      path: '/',
    }

    response.cookie('access_token', accessToken, { ...cookieOptions, maxAge: accessTokenMaxAge })
    response.cookie('refresh_token', refreshToken, { ...cookieOptions, maxAge: refreshTokenMaxAge })

    return user
  }

  @Post('refresh')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  refresh(@Body() dto: RefreshTokenDto): Promise<RefreshResponseDto> {
    return this.refreshTokenUseCase.execute(dto)
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Body() dto: LogoutDto): Promise<void> {
    return this.logoutUseCase.execute(dto)
  }

  @Get('me')
  @HttpCode(200)
  me(@CurrentUser() authUser: AuthenticatedUser): Promise<MeResponseDto> {
    return this.meUseCase.execute(authUser.userId)
  }
}
