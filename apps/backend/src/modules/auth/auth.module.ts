import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { TypeOrmModule } from '@nestjs/typeorm'
import { getEnvConfig } from '../../config/env.config'
import { ClinicsModule } from '../clinics/clinics.module'
import { ThemesModule } from '../themes/themes.module'
import { UsersModule } from '../users/users.module'
import { AuthController } from './controllers/auth.controller'
import { PasswordSetToken } from './entities/password-set-token.entity'
import { RefreshToken } from './entities/refresh-token.entity'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { IPasswordSetTokensRepository } from './repositories/password-set-tokens.repository.interface'
import { PasswordSetTokensRepository } from './repositories/password-set-tokens.repository'
import { IRefreshTokensRepository } from './repositories/refresh-tokens.repository.interface'
import { RefreshTokensRepository } from './repositories/refresh-tokens.repository'
import { JwtStrategy } from './strategies/jwt.strategy'
import { IEmailAdapter } from './adapters/email.adapter.interface'
import { SmtpEmailAdapter } from './adapters/smtp-email.adapter'
import { LoginUseCase } from './use-cases/login.use-case'
import { LogoutUseCase } from './use-cases/logout.use-case'
import { MeUseCase } from './use-cases/me.use-case'
import { RefreshTokenUseCase } from './use-cases/refresh-token.use-case'
import { SendSetPasswordEmailUseCase } from './use-cases/send-set-password-email.use-case'
import { ValidateSetPasswordTokenUseCase } from './use-cases/validate-set-password-token.use-case'
import { SetPasswordUseCase } from './use-cases/set-password.use-case'
import { AUTH_ENV } from './use-cases/auth-env.token'

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => {
        const env = getEnvConfig()
        return { secret: env.JWT_SECRET, signOptions: { expiresIn: env.JWT_EXPIRATION } }
      },
    }),
    TypeOrmModule.forFeature([RefreshToken, PasswordSetToken]),
    UsersModule,
    ClinicsModule,
    ThemesModule,
  ],
  controllers: [AuthController],
  providers: [
    {
      provide: AUTH_ENV,
      useFactory: () => {
        const env = getEnvConfig()
        return {
          jwtSecret: env.JWT_SECRET,
          jwtExpiration: env.JWT_EXPIRATION,
          jwtRefreshExpiration: env.JWT_REFRESH_EXPIRATION,
        }
      },
    },
    JwtStrategy,
    JwtAuthGuard,
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    MeUseCase,
    SendSetPasswordEmailUseCase,
    ValidateSetPasswordTokenUseCase,
    SetPasswordUseCase,
    { provide: IRefreshTokensRepository, useClass: RefreshTokensRepository },
    { provide: IPasswordSetTokensRepository, useClass: PasswordSetTokensRepository },
    { provide: IEmailAdapter, useClass: SmtpEmailAdapter },
  ],
  exports: [JwtAuthGuard, SendSetPasswordEmailUseCase],
})
export class AuthModule {}
