import * as winston from 'winston'

export interface IEnvConfig {
  DB_HOST: string
  DB_PORT: number
  DB_USER: string
  DB_PASS: string
  DB_NAME: string
  DB_SCHEMA: string
  REDIS_HOST: string
  REDIS_PORT: number
  JWT_SECRET: string
  JWT_EXPIRATION: string
  JWT_REFRESH_EXPIRATION: string
  FRONTEND_URL: string
}

export function getEnvConfig(): IEnvConfig {
  const required: (keyof IEnvConfig)[] = [
    'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASS', 'DB_NAME', 'DB_SCHEMA',
    'REDIS_HOST', 'REDIS_PORT', 'JWT_SECRET', 'JWT_EXPIRATION',
    'JWT_REFRESH_EXPIRATION', 'FRONTEND_URL',
  ]

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`)
    }
  }

  return {
    DB_HOST: process.env.DB_HOST!,
    DB_PORT: parseInt(process.env.DB_PORT!, 10),
    DB_USER: process.env.DB_USER!,
    DB_PASS: process.env.DB_PASS!,
    DB_NAME: process.env.DB_NAME!,
    DB_SCHEMA: process.env.DB_SCHEMA!,
    REDIS_HOST: process.env.REDIS_HOST!,
    REDIS_PORT: parseInt(process.env.REDIS_PORT!, 10),
    JWT_SECRET: process.env.JWT_SECRET!,
    JWT_EXPIRATION: process.env.JWT_EXPIRATION!,
    JWT_REFRESH_EXPIRATION: process.env.JWT_REFRESH_EXPIRATION!,
    FRONTEND_URL: process.env.FRONTEND_URL!,
  }
}

export function createWinstonConfig(): winston.LoggerOptions {
  const env = process.env.NODE_ENV ?? 'development'
  const level = env === 'production' ? 'warn' : 'debug'

  return {
    level,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
    ),
    transports: [new winston.transports.Console()],
  }
}
