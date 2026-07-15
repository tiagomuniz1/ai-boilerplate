import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { DataSource, ILike } from 'typeorm'
import { databaseConfig } from '../database.config'
import { MedicalRecordCanonicalField } from '../../modules/medical-record-canonical-fields/entities/medical-record-canonical-field.entity'
import { Specialty } from '../../modules/specialties/entities/specialty.entity'
import { CANONICAL_FIELDS } from './canonical-fields/canonical-fields'

// Publishes the canonical medical-record field catalogue into the configured
// database. Idempotent: upserts by unique canonicalKey (existing fields are left
// untouched), so it is safe to run repeatedly and in any environment.
// Specialty-scoped fields are resolved by specialty NAME against the target
// database; if the specialty is absent, the field is skipped with a warning.
async function run(): Promise<void> {
  const dataSource = new DataSource({ ...databaseConfig, logging: false })
  await dataSource.initialize()

  const repository = dataSource.getRepository(MedicalRecordCanonicalField)
  const specialtyRepository = dataSource.getRepository(Specialty)
  let created = 0
  let skipped = 0

  try {
    for (const data of CANONICAL_FIELDS) {
      const existing = await repository.findOneBy({ canonicalKey: data.canonicalKey })
      if (existing) {
        skipped += 1
        continue
      }

      let specialtyId: string | null = null
      if (data.specialtyName) {
        const specialty = await specialtyRepository.findOne({
          where: { name: ILike(data.specialtyName) },
        })
        if (!specialty) {
          skipped += 1
          console.warn(
            `[run-import-canonical-fields] specialty "${data.specialtyName}" not found — skipping field "${data.canonicalKey}"`,
          )
          continue
        }
        specialtyId = specialty.id
      }

      await repository.save(
        repository.create({
          canonicalKey: data.canonicalKey,
          label: data.label,
          type: data.type,
          options: data.options ?? null,
          unit: data.unit ?? null,
          specialtyId,
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
