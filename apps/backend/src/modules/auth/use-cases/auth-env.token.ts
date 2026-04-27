export const AUTH_ENV = 'AUTH_ENV'

export interface IAuthEnv {
  jwtSecret: string
  jwtExpiration: string
  jwtRefreshExpiration: string
}

export function parseTtlToSeconds(ttl: string): number {
  const match = ttl.match(/^(\d+)(s|m|h|d)$/)
  if (!match) return parseInt(ttl, 10)
  const value = parseInt(match[1], 10)
  const unit = match[2]
  switch (unit) {
    case 's': return value
    case 'm': return value * 60
    case 'h': return value * 3600
    case 'd': return value * 86400
    default: return value
  }
}
