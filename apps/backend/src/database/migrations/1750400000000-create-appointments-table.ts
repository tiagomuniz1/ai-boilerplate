import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAppointmentsTable1750400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      CREATE TABLE "appointments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "clinic_id" uuid NOT NULL REFERENCES "clinics"("id"),
        "doctor_id" uuid NOT NULL REFERENCES "doctors"("id"),
        "patient_id" uuid NOT NULL REFERENCES "patients"("id"),
        "schedule_id" uuid NOT NULL REFERENCES "schedules"("id"),
        "date" date NOT NULL,
        "start_time" varchar NOT NULL,
        "end_time" varchar NOT NULL,
        "status" varchar NOT NULL DEFAULT 'scheduled',
        "reason" text NULL,
        "cancellation_reason" text NULL,
        "version" integer NOT NULL DEFAULT 1,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL
      )
    `)

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_appointment_slot_scheduled"
      ON "appointments" ("clinic_id", "doctor_id", "date", "start_time")
      WHERE status = 'scheduled' AND deleted_at IS NULL
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_appointments_clinic_doctor_date"
      ON "appointments" ("clinic_id", "doctor_id", "date")
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_appointments_clinic_patient"
      ON "appointments" ("clinic_id", "patient_id")
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_appointments_clinic_status"
      ON "appointments" ("clinic_id", "status")
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_appointments_schedule_id"
      ON "appointments" ("schedule_id")
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_appointments_schedule_id"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_appointments_clinic_status"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_appointments_clinic_patient"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_appointments_clinic_doctor_date"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_appointment_slot_scheduled"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "appointments"`)
  }
}
