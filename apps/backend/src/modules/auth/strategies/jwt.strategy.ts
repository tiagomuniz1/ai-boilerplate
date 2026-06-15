import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Request } from 'express'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { UserRole } from '@app/shared'
import { getEnvConfig } from '../../../config/env.config'
import { ICurrentUser } from '../types/current-user.type'

export interface JwtPayload {
  sub: string
  email: string
  role?: UserRole
  clinicId: string | null
  iat: number
  exp: number
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          const slug = request?.headers?.['x-clinic-slug'] as string | undefined
          const cookieName = slug && slug !== 'backoffice' ? `access_token_${slug}` : 'access_token'
          return request?.cookies?.[cookieName] ?? null
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: getEnvConfig().JWT_SECRET,
    })
  }

  validate(payload: JwtPayload): ICurrentUser {
    if (!payload.clinicId && payload.role !== UserRole.PLATFORM_ADMIN) {
      throw new UnauthorizedException('Invalid token')
    }
    return { id: payload.sub, role: payload.role ?? UserRole.USER, clinicId: payload.clinicId ?? null }
  }
}
