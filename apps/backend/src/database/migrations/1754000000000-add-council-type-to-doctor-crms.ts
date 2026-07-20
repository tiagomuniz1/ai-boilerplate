import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddCouncilTypeToDoctorCrms1754000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      ALTER TABLE "doctor_crms" ADD COLUMN IF NOT EXISTS "council_type" varchar(20) NOT NULL DEFAULT 'crm'
    `)
    // Backfill explicit — every registration created before this migration is a CRM.
    await queryRunner.query(`UPDATE "doctor_crms" SET "council_type" = 'crm'`)
    await queryRunner.query(`ALTER TABLE "doctor_crms" ALTER COLUMN "council_type" DROP DEFAULT`)

    // Widen "number" to a generic ceiling so future council types never require another
    // destructive column-width migration — real format validation lives in the DTO layer.
    await queryRunner.query(`ALTER TABLE "doctor_crms" ALTER COLUMN "number" TYPE varchar(20)`)

    await queryRunner.query(`DROP INDEX IF EXISTS "doctor_crms_number_state_clinic_active_unique"`)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "doctor_crms_council_number_state_clinic_active_unique"
        ON "doctor_crms" ("council_type", "number", "state", "clinic_id")
        WHERE "deleted_at" IS NULL
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    const [{ count }] = await queryRunner.query(
      `SELECT COUNT(*) as count FROM "doctor_crms" WHERE length("number") > 6`,
    )
    if (parseInt(count, 10) > 0) {
      throw new Error(
        'Cannot revert: doctor_crms contains "number" values longer than 6 characters (non-CRM registrations already exist).',
      )
    }

    await queryRunner.query(`DROP INDEX IF EXISTS "doctor_crms_council_number_state_clinic_active_unique"`)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "doctor_crms_number_state_clinic_active_unique"
        ON "doctor_crms" ("number", "state", "clinic_id")
        WHERE "deleted_at" IS NULL
    `)

    await queryRunner.query(`ALTER TABLE "doctor_crms" ALTER COLUMN "number" TYPE varchar(6)`)
    await queryRunner.query(`ALTER TABLE "doctor_crms" DROP COLUMN IF EXISTS "council_type"`)
  }
}
