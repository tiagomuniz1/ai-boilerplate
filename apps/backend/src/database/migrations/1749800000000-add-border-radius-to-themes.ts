import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddBorderRadiusToThemes1749800000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)
    await queryRunner.query(`
      ALTER TABLE "themes"
        ADD COLUMN IF NOT EXISTS "border_radius" VARCHAR(10) NOT NULL DEFAULT 'default'
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)
    await queryRunner.query(`ALTER TABLE "themes" DROP COLUMN IF EXISTS "border_radius"`)
  }
}
