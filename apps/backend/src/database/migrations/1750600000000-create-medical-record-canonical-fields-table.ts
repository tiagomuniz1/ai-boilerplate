import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateMedicalRecordCanonicalFieldsTable1750600000000 implements MigrationInterface {
  name = 'CreateMedicalRecordCanonicalFieldsTable1750600000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      CREATE TABLE "medical_record_canonical_fields" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "canonical_key" VARCHAR NOT NULL,
        "label" VARCHAR NOT NULL,
        "type" VARCHAR NOT NULL,
        "options" JSONB,
        "unit" VARCHAR,
        "specialty_id" UUID,
        "description" VARCHAR,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_medical_record_canonical_fields" PRIMARY KEY ("id"),
        CONSTRAINT "FK_canonical_fields_specialty" FOREIGN KEY ("specialty_id")
          REFERENCES "specialties"("id") ON DELETE RESTRICT
      )
    `)

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_canonical_field_key"
        ON "medical_record_canonical_fields" ("canonical_key")
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_canonical_fields_specialty"
        ON "medical_record_canonical_fields" ("specialty_id")
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_canonical_fields_specialty"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_canonical_field_key"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "medical_record_canonical_fields"`)
  }
}
