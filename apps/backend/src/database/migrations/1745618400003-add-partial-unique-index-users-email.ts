import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddPartialUniqueIndexUsersEmail1745618400003 implements MigrationInterface {
  name = 'AddPartialUniqueIndexUsersEmail1745618400003'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "UQ_users_email"`)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_users_email_active"
      ON "users" ("email")
      WHERE "deleted_at" IS NULL
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_users_email_active"`)
    await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_users_email" UNIQUE ("email")`)
  }
}
