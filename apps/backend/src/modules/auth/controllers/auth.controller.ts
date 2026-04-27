import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { Public } from '../decorators/public.decorator'
import { AuthResponseDto, RefreshResponseDto } from '../dto/auth-response.dto'
import { LoginDto } from '../dto/login.dto'
import { LogoutDto } from '../dto/logout.dto'
import { RefreshTokenDto } from '../dto/refresh-token.dto'
import { LoginUseCase } from '../use-cases/login.use-case'
import { LogoutUseCase } from '../use-cases/logout.use-case'
import { RefreshTokenUseCase } from '../use-cases/refresh-token.use-case'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  @Post('login')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.loginUseCase.execute(dto)
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
}
