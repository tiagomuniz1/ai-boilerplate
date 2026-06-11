import { MigrationInterface, QueryRunner } from 'typeorm'

const SEED_CLINIC_ID = '10000000-0000-4000-8000-000000000000'

export class AddClinicIdToDoctors1749300000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      ALTER TABLE "doctors"
        ADD COLUMN "clinic_id" UUID NOT NULL DEFAULT '${SEED_CLINIC_ID}'
        REFERENCES "clinics"("id")
    `)

    await queryRunner.query(`DROP INDEX IF EXISTS "doctors_crm_number_active_unique"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "doctors_user_id_active_unique"`)

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "doctors_crm_number_clinic_active_unique"
        ON "doctors" ("crm_number", "clinic_id")
        WHERE "deleted_at" IS NULL
    `)

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "doctors_user_id_clinic_active_unique"
        ON "doctors" ("user_id", "clinic_id")
        WHERE "deleted_at" IS NULL
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP INDEX IF EXISTS "doctors_crm_number_clinic_active_unique"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "doctors_user_id_clinic_active_unique"`)

    await queryRunner.query(`ALTER TABLE "doctors" DROP COLUMN IF EXISTS "clinic_id"`)

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "doctors_crm_number_active_unique"
        ON "doctors" ("crm_number")
        WHERE "deleted_at" IS NULL
    `)

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "doctors_user_id_active_unique"
        ON "doctors" ("user_id")
        WHERE "deleted_at" IS NULL
    `)
  }
}
