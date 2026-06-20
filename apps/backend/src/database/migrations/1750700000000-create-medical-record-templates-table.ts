import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateMedicalRecordTemplatesTable1750700000000 implements MigrationInterface {
  name = 'CreateMedicalRecordTemplatesTable1750700000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      CREATE TABLE "medical_record_templates" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "clinic_id" UUID NOT NULL,
        "specialty_id" UUID NOT NULL,
        "name" VARCHAR NOT NULL,
        "fields" JSONB NOT NULL DEFAULT '[]',
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "version" INTEGER NOT NULL DEFAULT 1,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_medical_record_templates" PRIMARY KEY ("id"),
        CONSTRAINT "FK_templates_clinic" FOREIGN KEY ("clinic_id")
          REFERENCES "clinics"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_templates_specialty" FOREIGN KEY ("specialty_id")
          REFERENCES "specialties"("id") ON DELETE RESTRICT,
        CONSTRAINT "UQ_template_id_specialty" UNIQUE ("id", "specialty_id")
      )
    `)

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_template_clinic_specialty"
        ON "medical_record_templates" ("clinic_id", "specialty_id")
        WHERE "deleted_at" IS NULL
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_templates_clinic"
        ON "medical_record_templates" ("clinic_id")
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_templates_clinic"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_template_clinic_specialty"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "medical_record_templates"`)
  }
}
