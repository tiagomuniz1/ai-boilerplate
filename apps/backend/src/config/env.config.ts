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
  PUBLIC_API_URL: string
  COOKIE_DOMAIN: string | undefined
  AWS_S3_BUCKET: string | undefined
  AWS_REGION: string | undefined
  SMTP_HOST: string | undefined
  SMTP_PORT: number
  SMTP_USER: string | undefined
  SMTP_PASS: string | undefined
  SMTP_FROM: string
  ACCESS_REQUEST_TO_EMAIL: string
  TURNSTILE_SECRET_KEY: string | undefined
  REMINDERS_ENABLED: boolean
  AWS_SMS_ORIGINATION_IDENTITY: string | undefined
  AWS_SMS_CONFIG_SET: string | undefined
  REMINDER_OFFSETS_HOURS: string | undefined
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
    // Public base URL of this API — used to build clinic branding URLs served by the backend.
    // Falls back to localhost for local/dev; production must set it (Parameter Store).
    PUBLIC_API_URL: process.env.PUBLIC_API_URL ?? `http://localhost:${process.env.PORT ?? '3001'}`,
    // Cookie Domain for auth cookies. Empty in local dev (host-only cookies on
    // localhost); set to `.pulso.center` in prod so the cookie is readable both
    // on slug.pulso.center (middleware) and api.pulso.center (API).
    COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || undefined,
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
    AWS_REGION: process.env.AWS_REGION,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: parseInt(process.env.SMTP_PORT ?? '587', 10),
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM ?? 'noreply@pulso.center',
    // Inbox that receives every "solicitar acesso" submission from the institutional
    // website — whoever owns it decides whether to grant the requester a clinic.
    ACCESS_REQUEST_TO_EMAIL: process.env.ACCESS_REQUEST_TO_EMAIL ?? 'contato@pulso.center',
    // Cloudflare Turnstile secret key, used to verify the captcha token required
    // from the 3rd failed login attempt onward. Undefined in local dev falls back
    // to Turnstile's official always-pass test secret in the adapter.
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
    // Appointment-reminder cron master switch. Off by default so dev/test never
    // send; production turns it on via Parameter Store.
    REMINDERS_ENABLED: process.env.REMINDERS_ENABLED === 'true',
    // AWS End User Messaging SMS (Pinpoint SMS Voice v2) origination identity —
    // the registered sender ID / phone-number id / pool ARN messages are sent from.
    // When unset the SMS adapter skips sending (lets us deploy before the Brazil
    // sender registration is approved).
    AWS_SMS_ORIGINATION_IDENTITY: process.env.AWS_SMS_ORIGINATION_IDENTITY,
    // Optional SMS configuration set (event destinations / opt-out list).
    AWS_SMS_CONFIG_SET: process.env.AWS_SMS_CONFIG_SET,
    // Optional override for how many hours before the appointment reminders fire,
    // comma-separated (e.g. "24,3"). Falls back to the module default when unset.
    REMINDER_OFFSETS_HOURS: process.env.REMINDER_OFFSETS_HOURS,
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
