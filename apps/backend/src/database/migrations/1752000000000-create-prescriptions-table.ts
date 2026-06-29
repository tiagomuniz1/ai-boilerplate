import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreatePrescriptionsTable1752000000000 implements MigrationInterface {
  name = 'CreatePrescriptionsTable1752000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      CREATE TABLE "prescriptions" (
        "id"             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        "clinic_id"      uuid        NOT NULL,
        "appointment_id" uuid        NOT NULL,
        "patient_id"     uuid        NOT NULL,
        "doctor_id"      uuid        NOT NULL,
        "snapshot"       jsonb       NOT NULL,
        "issued_at"      timestamptz NOT NULL,
        "created_at"     timestamptz NOT NULL DEFAULT now(),
        "updated_at"     timestamptz NOT NULL DEFAULT now(),
        "deleted_at"     timestamptz NULL
      )
    `)

    await queryRunner.query(`CREATE INDEX "IDX_prescriptions_appointment_id" ON "prescriptions" ("appointment_id")`)
    await queryRunner.query(`CREATE INDEX "IDX_prescriptions_patient_id" ON "prescriptions" ("patient_id")`)
    await queryRunner.query(`CREATE INDEX "IDX_prescriptions_clinic_id" ON "prescriptions" ("clinic_id")`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_prescriptions_clinic_id"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_prescriptions_patient_id"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_prescriptions_appointment_id"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "prescriptions"`)
  }
}
