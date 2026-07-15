import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { DataSource } from 'typeorm'
import { databaseConfig } from '../database.config'
import { Theme } from '../../modules/themes/entities/theme.entity'
import { CANONICAL_THEMES } from './themes/canonical-themes'

// Publishes the canonical platform theme catalogue into the configured database.
// Idempotent: upserts by unique slug (existing themes are left untouched), so it
// is safe to run repeatedly and in any environment (staging/production).
async function run(): Promise<void> {
  const dataSource = new DataSource({ ...databaseConfig, logging: false })
  await dataSource.initialize()

  const repository = dataSource.getRepository(Theme)
  let created = 0
  let skipped = 0

  try {
    for (const data of CANONICAL_THEMES) {
      const existing = await repository.findOneBy({ slug: data.slug })
      if (existing) {
        skipped += 1
        continue
      }
      await repository.save(repository.create(data))
      created += 1
      console.log(`[run-import-themes] theme "${data.name}" created`)
    }

    console.log(
      `[run-import-themes] Completed. total=${CANONICAL_THEMES.length} created=${created} skipped=${skipped}`,
    )
  } finally {
    await dataSource.destroy()
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[run-import-themes] Failed:', err)
    process.exit(1)
  })
