import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateMedicalRecordsTable1750900000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      CREATE TABLE "medical_records" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "clinic_id" uuid NOT NULL REFERENCES "clinics"("id"),
        "appointment_id" uuid NOT NULL REFERENCES "appointments"("id"),
        "patient_id" uuid NOT NULL REFERENCES "patients"("id"),
        "doctor_id" uuid NOT NULL REFERENCES "doctors"("id"),
        "specialty_id" uuid NOT NULL REFERENCES "specialties"("id"),
        "template_id" uuid NOT NULL,
        "template_schema_snapshot" jsonb NOT NULL,
        "data" jsonb NOT NULL DEFAULT '{}',
        "notes" text NULL,
        "version" integer NOT NULL DEFAULT 1,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "FK_medical_record_template_specialty"
          FOREIGN KEY ("template_id","specialty_id")
          REFERENCES "medical_record_templates" ("id","specialty_id")
      )
    `)

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_medical_record_appointment"
        ON "medical_records" ("appointment_id") WHERE "deleted_at" IS NULL
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_medical_records_clinic_patient"
        ON "medical_records" ("clinic_id","patient_id")
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_medical_records_clinic_doctor"
        ON "medical_records" ("clinic_id","doctor_id")
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_medical_records_clinic_doctor"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_medical_records_clinic_patient"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_medical_record_appointment"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "medical_records"`)
  }
}
