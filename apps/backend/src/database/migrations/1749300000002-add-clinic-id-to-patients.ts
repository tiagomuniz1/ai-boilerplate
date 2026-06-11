import { MigrationInterface, QueryRunner } from 'typeorm'

const SEED_CLINIC_ID = '10000000-0000-4000-8000-000000000000'

export class AddClinicIdToPatients1749300000002 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      ALTER TABLE "patients"
        ADD COLUMN "clinic_id" UUID NOT NULL DEFAULT '${SEED_CLINIC_ID}'
        REFERENCES "clinics"("id")
    `)

    await queryRunner.query(`DROP INDEX IF EXISTS "patients_document_number_active_unique"`)

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "patients_document_number_clinic_active_unique"
        ON "patients" ("document_number", "clinic_id")
        WHERE "deleted_at" IS NULL
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP INDEX IF EXISTS "patients_document_number_clinic_active_unique"`)

    await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN IF EXISTS "clinic_id"`)

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "patients_document_number_active_unique"
        ON "patients" ("document_number")
        WHERE "deleted_at" IS NULL
    `)
  }
}
