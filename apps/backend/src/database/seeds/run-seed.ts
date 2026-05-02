import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { DataSource } from 'typeorm'
import { databaseConfig } from '../database.config'
import { devSeed } from './dev/dev.seed'

async function run() {
  const dataSource = new DataSource({ ...databaseConfig, logging: false })
  await dataSource.initialize()
  await devSeed(dataSource)
  await dataSource.destroy()
}

run()
  .then(() => {
    console.log('Seed completed.')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
