import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddActiveIngredientIdToMedications1752300000000 implements MigrationInterface {
  name = 'AddActiveIngredientIdToMedications1752300000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      ALTER TABLE "medications"
        ADD COLUMN "active_ingredient_id" uuid NULL
          REFERENCES "active_ingredients" ("id") ON DELETE SET NULL
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_medications_active_ingredient_id"
      ON "medications" ("active_ingredient_id")
    `)

    // Backfill: populate active_ingredients from existing medications data,
    // then link each medication to its canonical active ingredient record.
    await queryRunner.query(`
      INSERT INTO "active_ingredients" ("name")
      SELECT DISTINCT "active_ingredient"
      FROM "medications"
      WHERE "active_ingredient" IS NOT NULL
      ON CONFLICT ("name") DO NOTHING
    `)

    await queryRunner.query(`
      UPDATE "medications" m
      SET "active_ingredient_id" = ai."id"
      FROM "active_ingredients" ai
      WHERE m."active_ingredient" = ai."name"
        AND m."active_ingredient_id" IS NULL
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_medications_active_ingredient_id"`)
    await queryRunner.query(`ALTER TABLE "medications" DROP COLUMN IF EXISTS "active_ingredient_id"`)
  }
}
