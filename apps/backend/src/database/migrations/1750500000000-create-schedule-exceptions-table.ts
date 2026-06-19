import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateScheduleExceptionsTable1750500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      CREATE TABLE "schedule_exceptions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "clinic_id" uuid NOT NULL REFERENCES "clinics"("id"),
        "doctor_id" uuid NOT NULL REFERENCES "doctors"("id"),
        "date" varchar NOT NULL,
        "start_time" varchar NULL,
        "end_time" varchar NULL,
        "reason" varchar(500) NULL,
        "version" integer NOT NULL DEFAULT 1,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL
      )
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_schedule_exceptions_clinic_doctor_date"
      ON "schedule_exceptions" ("clinic_id", "doctor_id", "date")
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_schedule_exceptions_clinic_doctor_date"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "schedule_exceptions"`)
  }
}
