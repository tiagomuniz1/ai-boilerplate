import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateExamRequestsTable1752900000000 implements MigrationInterface {
  name = 'CreateExamRequestsTable1752900000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      CREATE TABLE "exam_requests" (
        "id"             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        "clinic_id"      uuid        NOT NULL,
        "appointment_id" uuid        NOT NULL,
        "patient_id"     uuid        NOT NULL,
        "doctor_id"      uuid        NOT NULL,
        "snapshot"       jsonb       NOT NULL,
        "status"         varchar(20) NOT NULL DEFAULT 'requested',
        "issued_at"      timestamptz NOT NULL,
        "created_at"     timestamptz NOT NULL DEFAULT now(),
        "updated_at"     timestamptz NOT NULL DEFAULT now(),
        "deleted_at"     timestamptz NULL
      )
    `)

    await queryRunner.query(`CREATE INDEX "IDX_exam_requests_appointment_id" ON "exam_requests" ("appointment_id")`)
    await queryRunner.query(`CREATE INDEX "IDX_exam_requests_patient_id" ON "exam_requests" ("patient_id")`)
    await queryRunner.query(`CREATE INDEX "IDX_exam_requests_clinic_id" ON "exam_requests" ("clinic_id")`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_exam_requests_clinic_id"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_exam_requests_patient_id"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_exam_requests_appointment_id"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "exam_requests"`)
  }
}
