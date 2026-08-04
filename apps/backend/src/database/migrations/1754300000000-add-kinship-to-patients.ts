import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddKinshipToPatients1754300000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`ALTER TABLE "patients" ALTER COLUMN "document_number" DROP NOT NULL`)

    await queryRunner.query(`
      ALTER TABLE "patients"
        ADD COLUMN "responsible_patient_id" UUID NULL
        REFERENCES "patients"("id") ON DELETE RESTRICT
    `)

    await queryRunner.query(`ALTER TABLE "patients" ADD COLUMN "kinship_type" VARCHAR(20) NULL`)

    await queryRunner.query(`
      CREATE INDEX "patients_responsible_patient_id_active_idx"
        ON "patients" ("responsible_patient_id")
        WHERE "deleted_at" IS NULL
    `)

    await queryRunner.query(`
      ALTER TABLE "patients" ADD CONSTRAINT "patients_kinship_requires_responsible_chk"
        CHECK (
          ("responsible_patient_id" IS NULL AND "kinship_type" IS NULL)
          OR
          ("responsible_patient_id" IS NOT NULL AND "kinship_type" IS NOT NULL)
        )
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`ALTER TABLE "patients" DROP CONSTRAINT IF EXISTS "patients_kinship_requires_responsible_chk"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "patients_responsible_patient_id_active_idx"`)
    await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN IF EXISTS "kinship_type"`)
    await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN IF EXISTS "responsible_patient_id"`)

    // Não restauramos NOT NULL em document_number aqui: uma vez que existam dependentes sem
    // CPF em produção, restaurar NOT NULL sem uma estratégia de backfill quebraria dados reais.
  }
}
