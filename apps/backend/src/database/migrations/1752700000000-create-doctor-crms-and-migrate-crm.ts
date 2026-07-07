import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateDoctorCrmsAndMigrateCrm1752700000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "doctor_crms" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "doctor_id" uuid NOT NULL,
        "clinic_id" uuid NOT NULL,
        "number" varchar(6) NOT NULL,
        "state" varchar(2) NOT NULL,
        "is_primary" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "PK_doctor_crms" PRIMARY KEY ("id"),
        CONSTRAINT "FK_doctor_crms_doctor" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_doctor_crms_clinic" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id")
      )
    `)

    // Migrate existing single crm_number (format "NNNNN/UF") into one primary CRM per doctor.
    // Copy the doctor's deleted_at so soft-deleted doctors do not reserve the CRM in the partial unique index.
    await queryRunner.query(`
      INSERT INTO "doctor_crms" ("doctor_id", "clinic_id", "number", "state", "is_primary", "deleted_at")
      SELECT "id", "clinic_id", split_part("crm_number", '/', 1), split_part("crm_number", '/', 2), true, "deleted_at"
      FROM "doctors"
    `)

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "doctor_crms_number_state_clinic_active_unique"
        ON "doctor_crms" ("number", "state", "clinic_id")
        WHERE "deleted_at" IS NULL
    `)

    await queryRunner.query(`DROP INDEX IF EXISTS "doctors_crm_number_clinic_active_unique"`)
    await queryRunner.query(`ALTER TABLE "doctors" DROP COLUMN IF EXISTS "crm_number"`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "crm_number" varchar(12)`)

    await queryRunner.query(`
      UPDATE "doctors" d
      SET "crm_number" = c."number" || '/' || c."state"
      FROM "doctor_crms" c
      WHERE c."doctor_id" = d."id" AND c."is_primary" = true AND c."deleted_at" IS NULL
    `)

    await queryRunner.query(`ALTER TABLE "doctors" ALTER COLUMN "crm_number" SET NOT NULL`)

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "doctors_crm_number_clinic_active_unique"
        ON "doctors" ("crm_number", "clinic_id")
        WHERE "deleted_at" IS NULL
    `)

    await queryRunner.query(`DROP TABLE IF EXISTS "doctor_crms"`)
  }
}
