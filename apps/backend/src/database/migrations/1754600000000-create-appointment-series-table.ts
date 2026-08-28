import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAppointmentSeriesTable1754600000000 implements MigrationInterface {
  name = 'CreateAppointmentSeriesTable1754600000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      CREATE TABLE "appointment_series" (
        "id"                         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        "clinic_id"                  uuid        NOT NULL REFERENCES "clinics"("id"),
        "professional_id"            uuid        NOT NULL REFERENCES "professionals"("id"),
        "patient_id"                 uuid        NOT NULL REFERENCES "patients"("id"),
        "specialty_id"               uuid        NULL REFERENCES "specialties"("id") ON DELETE RESTRICT,
        "recurrence_interval"        varchar(20) NOT NULL,
        "day_of_week"                varchar(20) NOT NULL,
        "start_time"                 varchar(5)  NOT NULL,
        "anchor_date"                date        NOT NULL,
        "requested_occurrence_count" integer     NULL,
        "requested_until_date"       date        NULL,
        "created_occurrence_count"   integer     NOT NULL,
        "created_by_user_id"         uuid        NOT NULL REFERENCES "users"("id"),
        "version"                    integer     NOT NULL DEFAULT 1,
        "created_at"                 timestamptz NOT NULL DEFAULT now(),
        "updated_at"                 timestamptz NOT NULL DEFAULT now(),
        "deleted_at"                 timestamptz NULL
      )
    `)

    await queryRunner.query(
      `CREATE INDEX "IDX_appointment_series_clinic_professional" ON "appointment_series" ("clinic_id", "professional_id")`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_appointment_series_clinic_patient" ON "appointment_series" ("clinic_id", "patient_id")`,
    )

    // A series must end somewhere: an occurrence count, an until date, or both.
    // Mirrors the HasRecurrenceTerminator validator on the DTO.
    await queryRunner.query(`
      ALTER TABLE "appointment_series"
      ADD CONSTRAINT "CK_appointment_series_has_terminator"
      CHECK ("requested_occurrence_count" IS NOT NULL OR "requested_until_date" IS NOT NULL)
    `)

    await queryRunner.query(`
      ALTER TABLE "appointments"
      ADD COLUMN "series_id"       uuid    NULL,
      ADD COLUMN "series_sequence" integer NULL
    `)
    await queryRunner.query(`
      ALTER TABLE "appointments"
      ADD CONSTRAINT "FK_appointments_series"
      FOREIGN KEY ("series_id") REFERENCES "appointment_series"("id") ON DELETE RESTRICT
    `)

    // Partial: the overwhelming majority of appointments are not recurring.
    await queryRunner.query(`
      CREATE INDEX "IDX_appointments_series_id_date"
      ON "appointments" ("series_id", "date") WHERE "series_id" IS NOT NULL
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_appointments_series_sequence"
      ON "appointments" ("series_id", "series_sequence")
      WHERE "series_id" IS NOT NULL AND "deleted_at" IS NULL
    `)
    await queryRunner.query(`
      ALTER TABLE "appointments"
      ADD CONSTRAINT "CK_appointments_series_pair"
      CHECK (("series_id" IS NULL AND "series_sequence" IS NULL)
          OR ("series_id" IS NOT NULL AND "series_sequence" IS NOT NULL))
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(
      `ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "CK_appointments_series_pair"`,
    )
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_appointments_series_sequence"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_appointments_series_id_date"`)
    await queryRunner.query(`ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "FK_appointments_series"`)
    await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN IF EXISTS "series_sequence"`)
    await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN IF EXISTS "series_id"`)

    await queryRunner.query(
      `ALTER TABLE "appointment_series" DROP CONSTRAINT IF EXISTS "CK_appointment_series_has_terminator"`,
    )
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_appointment_series_clinic_patient"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_appointment_series_clinic_professional"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "appointment_series"`)
  }
}
