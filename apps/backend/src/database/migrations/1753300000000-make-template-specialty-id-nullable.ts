import { MigrationInterface, QueryRunner } from 'typeorm'

export class MakeTemplateSpecialtyIdNullable1753300000000 implements MigrationInterface {
  name = 'MakeTemplateSpecialtyIdNullable1753300000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    // Generalist doctors have no specialty — templates and records may carry a NULL specialty.
    await queryRunner.query(
      `ALTER TABLE "medical_record_templates" ALTER COLUMN "specialty_id" DROP NOT NULL`,
    )
    await queryRunner.query(
      `ALTER TABLE "medical_records" ALTER COLUMN "specialty_id" DROP NOT NULL`,
    )

    // A plain UNIQUE(clinic_id, specialty_id) treats NULLs as distinct, so it would allow many
    // generalist templates per clinic. Split into two partial unique indexes:
    //  - specialists: one template per (clinic, specialty)
    //  - generalist:  at most one template per clinic where specialty_id IS NULL
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_template_clinic_specialty"`)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_template_clinic_specialty"
        ON "medical_record_templates" ("clinic_id", "specialty_id")
        WHERE "specialty_id" IS NOT NULL AND "deleted_at" IS NULL
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_template_clinic_generalist"
        ON "medical_record_templates" ("clinic_id")
        WHERE "specialty_id" IS NULL AND "deleted_at" IS NULL
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_template_clinic_generalist"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_template_clinic_specialty"`)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_template_clinic_specialty"
        ON "medical_record_templates" ("clinic_id", "specialty_id")
        WHERE "deleted_at" IS NULL
    `)

    // Reverting to NOT NULL assumes no generalist rows remain.
    await queryRunner.query(
      `ALTER TABLE "medical_records" ALTER COLUMN "specialty_id" SET NOT NULL`,
    )
    await queryRunner.query(
      `ALTER TABLE "medical_record_templates" ALTER COLUMN "specialty_id" SET NOT NULL`,
    )
  }
}
