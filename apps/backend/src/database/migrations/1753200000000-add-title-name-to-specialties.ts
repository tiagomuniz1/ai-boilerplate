import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddTitleNameToSpecialties1753200000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`ALTER TABLE "specialties" ADD COLUMN IF NOT EXISTS "title_name" varchar(100) NULL`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`ALTER TABLE "specialties" DROP COLUMN IF EXISTS "title_name"`)
  }
}
