import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddCouncilTypeToMedicalRecordTemplates1754100000000 implements MigrationInterface {
  name = 'AddCouncilTypeToMedicalRecordTemplates1754100000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    // Generalist templates (specialty_id IS NULL) are now scoped per profession (council_type)
    // instead of one shared row per clinic — non-medical professionals get their own bucket.
    await queryRunner.query(
      `ALTER TABLE "medical_record_templates" ADD COLUMN "council_type" varchar(20) NULL`,
    )

    // Every generalist template that exists today predates non-CRM professions and was created
    // for a generalist doctor — backfill explicitly so the new unique index below has something
    // to key on (invariant going forward: specialty_id XOR council_type is always set).
    await queryRunner.query(
      `UPDATE "medical_record_templates" SET "council_type" = 'crm' WHERE "specialty_id" IS NULL`,
    )

    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_template_clinic_generalist"`)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_template_clinic_council_type"
        ON "medical_record_templates" ("clinic_id", "council_type")
        WHERE "specialty_id" IS NULL AND "deleted_at" IS NULL
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_template_clinic_council_type"`)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_template_clinic_generalist"
        ON "medical_record_templates" ("clinic_id")
        WHERE "specialty_id" IS NULL AND "deleted_at" IS NULL
    `)

    // Reverting assumes at most one generalist row per clinic remains (true unless non-CRM
    // profession templates were created after this migration ran).
    await queryRunner.query(`ALTER TABLE "medical_record_templates" DROP COLUMN "council_type"`)
  }
}
