import { MigrationInterface, QueryRunner } from 'typeorm'

export class RenameDoctorCrmsToProfessionalRegistrations1754000000003 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`ALTER TABLE "doctor_crms" RENAME TO "professional_registrations"`)
    await queryRunner.query(`ALTER TABLE "professional_registrations" RENAME COLUMN "doctor_id" TO "professional_id"`)

    await queryRunner.query(`ALTER TABLE "professional_registrations" RENAME CONSTRAINT "PK_doctor_crms" TO "PK_professional_registrations"`)
    await queryRunner.query(`ALTER TABLE "professional_registrations" RENAME CONSTRAINT "FK_doctor_crms_doctor" TO "FK_professional_registrations_professional"`)
    await queryRunner.query(`ALTER TABLE "professional_registrations" RENAME CONSTRAINT "FK_doctor_crms_clinic" TO "FK_professional_registrations_clinic"`)

    await queryRunner.query(`DROP INDEX IF EXISTS "doctor_crms_council_number_state_clinic_active_unique"`)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "professional_registrations_council_number_state_clinic_active_unique"
        ON "professional_registrations" ("council_type", "number", "state", "clinic_id")
        WHERE "deleted_at" IS NULL
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP INDEX IF EXISTS "professional_registrations_council_number_state_clinic_active_unique"`)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "doctor_crms_council_number_state_clinic_active_unique"
        ON "professional_registrations" ("council_type", "number", "state", "clinic_id")
        WHERE "deleted_at" IS NULL
    `)

    await queryRunner.query(`ALTER TABLE "professional_registrations" RENAME CONSTRAINT "FK_professional_registrations_clinic" TO "FK_doctor_crms_clinic"`)
    await queryRunner.query(`ALTER TABLE "professional_registrations" RENAME CONSTRAINT "FK_professional_registrations_professional" TO "FK_doctor_crms_doctor"`)
    await queryRunner.query(`ALTER TABLE "professional_registrations" RENAME CONSTRAINT "PK_professional_registrations" TO "PK_doctor_crms"`)

    await queryRunner.query(`ALTER TABLE "professional_registrations" RENAME COLUMN "professional_id" TO "doctor_id"`)
    await queryRunner.query(`ALTER TABLE "professional_registrations" RENAME TO "doctor_crms"`)
  }
}
