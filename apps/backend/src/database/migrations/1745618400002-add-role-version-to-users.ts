import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddRoleVersionToUsers1745618400002 implements MigrationInterface {
  name = 'AddRoleVersionToUsers1745618400002'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "role" varchar NOT NULL DEFAULT 'user',
        ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "role"`)
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "version"`)
  }
}
