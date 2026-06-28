import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateMedicationsTable1751400000000 implements MigrationInterface {
  name = 'CreateMedicationsTable1751400000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      CREATE TABLE "medications" (
        "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name"                varchar(250) NOT NULL,
        "active_ingredient"   varchar(500) NULL,
        "regulatory_category" varchar(120) NULL,
        "therapeutic_class"   varchar(250) NULL,
        "holder_company"      varchar(250) NULL,
        "registration_number" varchar(40)  NULL,
        "registration_status" varchar(40)  NULL,
        "source"              varchar(20)  NOT NULL DEFAULT 'manual',
        "import_hash"         varchar(64)  NULL,
        "is_active"           boolean      NOT NULL DEFAULT true,
        "created_at"          timestamptz  NOT NULL DEFAULT now(),
        "updated_at"          timestamptz  NOT NULL DEFAULT now(),
        "deleted_at"          timestamptz  NULL
      )
    `)

    // Dedup target for the ANVISA import: unique only when present.
    // Manual entries keep import_hash NULL and never collide (nulls are distinct).
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_medications_import_hash"
      ON "medications" ("import_hash")
      WHERE "import_hash" IS NOT NULL
    `)
    await queryRunner.query(`CREATE INDEX "IDX_medications_name" ON "medications" ("name")`)
    await queryRunner.query(
      `CREATE INDEX "IDX_medications_active_ingredient" ON "medications" ("active_ingredient")`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_medications_active_ingredient"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_medications_name"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_medications_import_hash"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "medications"`)
  }
}
