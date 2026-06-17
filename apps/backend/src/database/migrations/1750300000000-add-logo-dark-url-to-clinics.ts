import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddLogoDarkUrlToClinics1750300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)
    await queryRunner.query(`
      ALTER TABLE clinics
        ADD COLUMN IF NOT EXISTS logo_dark_url VARCHAR(500) NULL DEFAULT NULL
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)
    await queryRunner.query(`
      ALTER TABLE clinics
        DROP COLUMN IF EXISTS logo_dark_url
    `)
  }
}
