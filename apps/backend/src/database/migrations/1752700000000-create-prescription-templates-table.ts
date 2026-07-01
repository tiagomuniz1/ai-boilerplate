import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreatePrescriptionTemplatesTable1752700000000 implements MigrationInterface {
  name = 'CreatePrescriptionTemplatesTable1752700000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      CREATE TABLE "prescription_templates" (
        "id"          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        "clinic_id"   uuid        NOT NULL,
        "doctor_id"   uuid        NOT NULL,
        "doctor_name" varchar     NOT NULL,
        "name"        varchar     NOT NULL,
        "items"       jsonb       NOT NULL,
        "notes"       text        NULL,
        "is_active"   boolean     NOT NULL DEFAULT true,
        "created_at"  timestamptz NOT NULL DEFAULT now(),
        "updated_at"  timestamptz NOT NULL DEFAULT now(),
        "deleted_at"  timestamptz NULL
      )
    `)

    await queryRunner.query(`CREATE INDEX "IDX_prescription_templates_clinic_doctor" ON "prescription_templates" ("clinic_id", "doctor_id")`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_prescription_templates_clinic_doctor"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "prescription_templates"`)
  }
}
