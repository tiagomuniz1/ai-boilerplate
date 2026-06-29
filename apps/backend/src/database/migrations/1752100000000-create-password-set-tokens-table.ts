import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreatePasswordSetTokensTable1752100000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "password_set_tokens" (
        "id"          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id"     UUID        NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "clinic_id"   UUID,
        "token_hash"  VARCHAR(64) NOT NULL UNIQUE,
        "expires_at"  TIMESTAMPTZ NOT NULL,
        "used_at"     TIMESTAMPTZ,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_password_set_tokens_user_id" ON "password_set_tokens"("user_id")
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_password_set_tokens_user_id"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "password_set_tokens"`)
  }
}
