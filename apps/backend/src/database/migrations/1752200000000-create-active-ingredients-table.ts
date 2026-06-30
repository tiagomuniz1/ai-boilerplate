import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateActiveIngredientsTable1752200000000 implements MigrationInterface {
  name = 'CreateActiveIngredientsTable1752200000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      CREATE TABLE "active_ingredients" (
        "id"         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        "name"       varchar(500) NOT NULL,
        "created_at" timestamptz  NOT NULL DEFAULT now(),
        "updated_at" timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_active_ingredients_name" UNIQUE ("name")
      )
    `)

    await queryRunner.query(
      `CREATE INDEX "IDX_active_ingredients_name" ON "active_ingredients" ("name")`,
    )

    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA public
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_active_ingredients_name_trgm"
      ON "active_ingredients" USING GIN ("name" gin_trgm_ops)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_active_ingredients_name_trgm"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_active_ingredients_name"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "active_ingredients"`)
  }
}
