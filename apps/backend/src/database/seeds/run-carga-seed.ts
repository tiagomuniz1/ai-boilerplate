// Force the carga schema before any imports that read process.env
process.env.DB_SCHEMA = 'carga'

import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { DataSource } from 'typeorm'
import { databaseConfig } from '../database.config'
import { cargaSeed } from './carga/carga.seed'

async function run() {
  const dataSource = new DataSource({ ...databaseConfig, schema: 'carga', logging: false } as any)

  await dataSource.initialize()

  // Ensure the carga schema exists
  const qr = dataSource.createQueryRunner()
  await qr.connect()
  await qr.query(`CREATE SCHEMA IF NOT EXISTS "carga"`)
  await qr.release()

  // Run pending migrations against carga schema
  console.log('[run-carga-seed] Running migrations against carga schema...')
  await dataSource.runMigrations()
  console.log('[run-carga-seed] Migrations done.')

  await cargaSeed(dataSource)
  await dataSource.destroy()
}

run()
  .then(() => {
    console.log('[run-carga-seed] Completed.')
    process.exit(0)
  })
  .catch((err) => {
    console.error('[run-carga-seed] Failed:', err)
    process.exit(1)
  })
