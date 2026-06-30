import { MigrationInterface, QueryRunner } from 'typeorm'

export class DropActiveIngredients1752500000000 implements MigrationInterface {
  name = 'DropActiveIngredients1752500000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_medications_active_ingredient_id"`)
    await queryRunner.query(`ALTER TABLE "medications" DROP COLUMN IF EXISTS "active_ingredient_id"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "active_ingredients"`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "active_ingredients" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(500) NOT NULL,
        "representative_medication_id" uuid NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_active_ingredients_name" UNIQUE ("name"),
        CONSTRAINT "PK_active_ingredients" PRIMARY KEY ("id")
      )
    `)

    await queryRunner.query(`
      ALTER TABLE "medications"
        ADD COLUMN "active_ingredient_id" uuid NULL
          REFERENCES "active_ingredients" ("id") ON DELETE SET NULL
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_medications_active_ingredient_id"
      ON "medications" ("active_ingredient_id")
    `)
  }
}
