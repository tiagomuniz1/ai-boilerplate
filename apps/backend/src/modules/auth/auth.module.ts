import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { TypeOrmModule } from '@nestjs/typeorm'
import { getEnvConfig } from '../../config/env.config'
import { UsersModule } from '../users/users.module'
import { AuthController } from './controllers/auth.controller'
import { RefreshToken } from './entities/refresh-token.entity'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { IRefreshTokensRepository } from './repositories/refresh-tokens.repository.interface'
import { RefreshTokensRepository } from './repositories/refresh-tokens.repository'
import { JwtStrategy } from './strategies/jwt.strategy'
import { LoginUseCase } from './use-cases/login.use-case'
import { LogoutUseCase } from './use-cases/logout.use-case'
import { RefreshTokenUseCase } from './use-cases/refresh-token.use-case'
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
    TypeOrmModule.forFeature([RefreshToken]),
    UsersModule,
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
    { provide: IRefreshTokensRepository, useClass: RefreshTokensRepository },
  ],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
