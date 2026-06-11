import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddThemeIdToClinics1749700000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)
    await queryRunner.query(`
      ALTER TABLE "clinics"
        ADD COLUMN IF NOT EXISTS "theme_id" UUID,
        ADD CONSTRAINT "FK_clinics_theme_id"
          FOREIGN KEY ("theme_id") REFERENCES "themes"("id") ON DELETE SET NULL
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)
    await queryRunner.query(`ALTER TABLE "clinics" DROP CONSTRAINT IF EXISTS "FK_clinics_theme_id"`)
    await queryRunner.query(`ALTER TABLE "clinics" DROP COLUMN IF EXISTS "theme_id"`)
  }
}
