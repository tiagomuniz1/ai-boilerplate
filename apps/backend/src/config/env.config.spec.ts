import { getEnvConfig, createWinstonConfig } from './env.config'

const validEnv = {
  DB_HOST: 'localhost',
  DB_PORT: '5499',
  DB_USER: 'postgres',
  DB_PASS: 'postgres',
  DB_NAME: 'app',
  DB_SCHEMA: 'dev',
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6379',
  JWT_SECRET: 'secret',
  JWT_EXPIRATION: '900s',
  JWT_REFRESH_EXPIRATION: '7d',
  FRONTEND_URL: 'http://localhost:3000',
}

describe('getEnvConfig', () => {
  let saved: NodeJS.ProcessEnv

  beforeEach(() => {
    saved = { ...process.env }
    Object.keys(validEnv).forEach((k) => delete process.env[k])
  })

  afterEach(() => {
    Object.keys(process.env).forEach((k) => {
      if (!(k in saved)) delete process.env[k]
    })
    Object.assign(process.env, saved)
  })

  it('returns parsed config when all vars are present', () => {
    Object.assign(process.env, validEnv)
    const config = getEnvConfig()
    expect(config.DB_HOST).toBe('localhost')
    expect(config.DB_PORT).toBe(5499)
    expect(config.REDIS_PORT).toBe(6379)
    expect(config.JWT_SECRET).toBe('secret')
  })

  it('throws when a required variable is missing', () => {
    Object.assign(process.env, validEnv)
    delete process.env.JWT_SECRET
    expect(() => getEnvConfig()).toThrow('Missing required environment variable: JWT_SECRET')
  })

  it.each(Object.keys(validEnv))('throws when %s is missing', (key) => {
    const env = { ...validEnv, [key]: undefined }
    Object.keys(env).forEach((k) => {
      if (env[k as keyof typeof env] === undefined) delete process.env[k]
      else process.env[k] = env[k as keyof typeof env]!
    })
    expect(() => getEnvConfig()).toThrow(`Missing required environment variable: ${key}`)
  })
})

describe('createWinstonConfig', () => {
  it('uses warn level in production', () => {
    const original = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    expect(createWinstonConfig().level).toBe('warn')
    process.env.NODE_ENV = original
  })

  it('uses debug level in non-production', () => {
    const original = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    expect(createWinstonConfig().level).toBe('debug')
    process.env.NODE_ENV = original
  })

  it('uses debug level when NODE_ENV is not set', () => {
    const original = process.env.NODE_ENV
    delete process.env.NODE_ENV
    expect(createWinstonConfig().level).toBe('debug')
    process.env.NODE_ENV = original
  })
})
