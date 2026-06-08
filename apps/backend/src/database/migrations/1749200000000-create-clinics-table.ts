import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateClinicsTable1749200000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "clinics" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "name" VARCHAR(120) NOT NULL,
        "slug" VARCHAR(80) NOT NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "version" INTEGER NOT NULL DEFAULT 1,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_clinics" PRIMARY KEY ("id")
      )
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "clinics_slug_unique"
        ON "clinics" ("slug")
        WHERE "deleted_at" IS NULL
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)
    await queryRunner.query('DROP INDEX IF EXISTS "clinics_slug_unique"')
    await queryRunner.query('DROP TABLE IF EXISTS "clinics"')
  }
}
