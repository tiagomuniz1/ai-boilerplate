import { DataSource } from 'typeorm'
import * as path from 'path'

process.env.NODE_ENV = 'test'
process.env.DB_HOST = process.env.DB_HOST ?? 'localhost'
process.env.DB_PORT = process.env.DB_PORT ?? '5499'
process.env.DB_USER = process.env.DB_USER ?? 'postgres'
process.env.DB_PASS = process.env.DB_PASS ?? 'postgres'
process.env.DB_NAME = process.env.DB_NAME ?? 'app'
process.env.DB_SCHEMA = 'test'
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-key'
process.env.JWT_EXPIRATION = process.env.JWT_EXPIRATION ?? '900s'
process.env.JWT_REFRESH_EXPIRATION = process.env.JWT_REFRESH_EXPIRATION ?? '7d'
process.env.FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000'
process.env.REDIS_HOST = process.env.REDIS_HOST ?? 'localhost'
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6379'

export default async function globalSetup() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT!, 10),
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    schema: 'test',
    entities: [path.join(__dirname, '../../**/*.entity{.ts,.js}')],
    migrations: [path.join(__dirname, '../../migrations/*{.ts,.js}')],
    synchronize: false,
  })

  await dataSource.initialize()
  await dataSource.runMigrations()
  await dataSource.destroy()
}
