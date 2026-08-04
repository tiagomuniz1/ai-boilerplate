import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { DataSource, ILike } from 'typeorm'
import { databaseConfig } from '../database.config'
import { Specialty } from '../../modules/specialties/entities/specialty.entity'
import { CANONICAL_SPECIALTIES } from './specialties/canonical-specialties'

// Publishes the canonical CRM specialty catalogue into the configured database.
// Idempotent: upserts by unique name (case-insensitive, matching
// create-specialty.use-case.ts's own uniqueness check) — existing specialties
// are left untouched, so it is safe to run repeatedly and in any environment.
async function run(): Promise<void> {
  const dataSource = new DataSource({ ...databaseConfig, logging: false })
  await dataSource.initialize()

  const repository = dataSource.getRepository(Specialty)
  let created = 0
  let skipped = 0

  try {
    for (const data of CANONICAL_SPECIALTIES) {
      const existing = await repository.findOneBy({ name: ILike(data.name) })
      if (existing) {
        skipped += 1
        continue
      }
      await repository.save(repository.create(data))
      created += 1
      console.log(`[run-import-specialties] specialty "${data.name}" created`)
    }

    console.log(
      `[run-import-specialties] Completed. total=${CANONICAL_SPECIALTIES.length} created=${created} skipped=${skipped}`,
    )
  } finally {
    await dataSource.destroy()
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[run-import-specialties] Failed:', err)
    process.exit(1)
  })
