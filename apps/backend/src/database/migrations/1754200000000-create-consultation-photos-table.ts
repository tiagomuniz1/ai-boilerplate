import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateConsultationPhotosTable1754200000000 implements MigrationInterface {
  name = 'CreateConsultationPhotosTable1754200000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      CREATE TABLE "consultation_photos" (
        "id"                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        "clinic_id"           uuid        NOT NULL,
        "appointment_id"      uuid        NOT NULL,
        "patient_id"          uuid        NOT NULL,
        "professional_id"     uuid        NOT NULL,
        "file_path"           text        NOT NULL,
        "file_name"           varchar(255) NOT NULL,
        "mime_type"           varchar(100) NOT NULL,
        "file_size_bytes"     integer     NOT NULL,
        "uploaded_by_user_id" uuid        NOT NULL,
        "created_at"          timestamptz NOT NULL DEFAULT now(),
        "updated_at"          timestamptz NOT NULL DEFAULT now(),
        "deleted_at"          timestamptz NULL
      )
    `)

    await queryRunner.query(`CREATE INDEX "IDX_consultation_photos_appointment_id" ON "consultation_photos" ("appointment_id")`)
    await queryRunner.query(`CREATE INDEX "IDX_consultation_photos_clinic_id" ON "consultation_photos" ("clinic_id")`)
    await queryRunner.query(`CREATE INDEX "IDX_consultation_photos_patient_professional" ON "consultation_photos" ("patient_id", "professional_id")`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_consultation_photos_patient_professional"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_consultation_photos_clinic_id"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_consultation_photos_appointment_id"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "consultation_photos"`)
  }
}
