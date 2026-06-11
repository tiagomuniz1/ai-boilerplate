import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateThemesTable1749600000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "themes" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "name" VARCHAR(120) NOT NULL,
        "slug" VARCHAR(80) NOT NULL,
        "is_default" BOOLEAN NOT NULL DEFAULT false,
        "accent_color" VARCHAR(7) NOT NULL,
        "accent_soft_color" VARCHAR(7) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_themes" PRIMARY KEY ("id")
      )
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "themes_slug_unique"
        ON "themes" ("slug")
        WHERE "deleted_at" IS NULL
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)
    await queryRunner.query('DROP INDEX IF EXISTS "themes_slug_unique"')
    await queryRunner.query('DROP TABLE IF EXISTS "themes"')
  }
}
