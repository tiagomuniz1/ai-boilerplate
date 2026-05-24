import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Request } from 'express'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { UserRole } from '@app/shared'
import { getEnvConfig } from '../../../config/env.config'

export interface JwtPayload {
  sub: string
  email: string
  role?: UserRole
  iat: number
  exp: number
}

export interface AuthenticatedUser {
  id: string
  email: string
  role: UserRole
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => request?.cookies?.access_token ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: getEnvConfig().JWT_SECRET,
    })
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    return { id: payload.sub, email: payload.email, role: payload.role ?? UserRole.USER }
  }
}
