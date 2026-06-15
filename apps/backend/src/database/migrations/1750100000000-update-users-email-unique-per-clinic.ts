import { MigrationInterface, QueryRunner } from 'typeorm'

export class UpdateUsersEmailUniquePerClinic1750100000000 implements MigrationInterface {
  name = 'UpdateUsersEmailUniquePerClinic1750100000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_users_email_active"`)

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_users_email_platform_admin"
      ON "users" ("email")
      WHERE "clinic_id" IS NULL AND "deleted_at" IS NULL
    `)

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_users_email_clinic"
      ON "users" ("email", "clinic_id")
      WHERE "clinic_id" IS NOT NULL AND "deleted_at" IS NULL
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_users_email_platform_admin"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_users_email_clinic"`)

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_users_email_active"
      ON "users" ("email")
      WHERE "deleted_at" IS NULL
    `)
  }
}
