import { DataSource, DataSourceOptions } from 'typeorm'
import * as path from 'path'

const isTest = process.env.NODE_ENV === 'test'

// RDS enforces TLS (rds.force_ssl). Enable SSL when DB_SSL is set, otherwise
// default to on in production (RDS) and off locally (docker-compose Postgres).
const useSsl = process.env.DB_SSL
  ? process.env.DB_SSL === 'true'
  : process.env.NODE_ENV === 'production'

export const databaseConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5499', 10),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? 'postgres',
  database: process.env.DB_NAME ?? 'app',
  schema: process.env.DB_SCHEMA ?? (isTest ? 'test' : 'dev'),
  entities: [path.join(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, './migrations/*{.ts,.js}')],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  ssl: useSsl ? { rejectUnauthorized: false } : false,
}

export default new DataSource(databaseConfig)
