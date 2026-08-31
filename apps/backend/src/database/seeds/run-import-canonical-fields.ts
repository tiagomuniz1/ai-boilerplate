import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { DataSource } from 'typeorm'
import { databaseConfig } from '../database.config'
import { MedicalRecordCanonicalField } from '../../modules/medical-record-canonical-fields/entities/medical-record-canonical-field.entity'
import { CANONICAL_FIELDS } from './canonical-fields/canonical-fields'

// Publishes the canonical medical-record field catalogue into the configured
// database. Idempotent: upserts by unique canonicalKey (existing fields are left
// untouched), so it is safe to run repeatedly and in any environment.
// The catalogue is global — no field is scoped to a specialty or profession, so
// nothing here can be silently dropped for a missing reference.
async function run(): Promise<void> {
  const dataSource = new DataSource({ ...databaseConfig, logging: false })
  await dataSource.initialize()

  const repository = dataSource.getRepository(MedicalRecordCanonicalField)
  let created = 0
  let skipped = 0

  try {
    for (const data of CANONICAL_FIELDS) {
      const existing = await repository.findOneBy({ canonicalKey: data.canonicalKey })
      if (existing) {
        skipped += 1
        continue
      }

      await repository.save(
        repository.create({
          canonicalKey: data.canonicalKey,
          label: data.label,
          type: data.type,
          options: data.options ?? null,
          unit: data.unit ?? null,
          description: data.description ?? null,
        }),
      )
      created += 1
      console.log(`[run-import-canonical-fields] canonical field "${data.canonicalKey}" created`)
    }

    console.log(
      `[run-import-canonical-fields] Completed. total=${CANONICAL_FIELDS.length} created=${created} skipped=${skipped}`,
    )
  } finally {
    await dataSource.destroy()
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[run-import-canonical-fields] Failed:', err)
    process.exit(1)
  })
