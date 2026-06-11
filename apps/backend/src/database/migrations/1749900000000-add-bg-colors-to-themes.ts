import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddBgColorsToThemes1749900000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)
    await queryRunner.query(`
      ALTER TABLE "themes"
        ADD COLUMN IF NOT EXISTS "bg_color" VARCHAR(7) NULL DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS "bg_dark_color" VARCHAR(7) NULL DEFAULT NULL
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)
    await queryRunner.query(`
      ALTER TABLE "themes"
        DROP COLUMN IF EXISTS "bg_color",
        DROP COLUMN IF EXISTS "bg_dark_color"
    `)
  }
}
