import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddMedicationsTrigramIndexes1751500000000 implements MigrationInterface {
  name = 'AddMedicationsTrigramIndexes1751500000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // pg_trgm is a database-level extension — must exist in public before it can be
    // referenced from the app schema.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA public`)

    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    // The plain btree on active_ingredient is dead weight: it can serve neither the
    // substring search (ILIKE '%term%') nor the ORDER BY name — drop it.
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_medications_active_ingredient"`)

    // Accelerate the medications search (name OR active_ingredient ILIKE '%term%').
    // Without these, both the page fetch (for rare terms) and the COUNT fall back to a
    // sequential scan over the whole table.
    await queryRunner.query(`
      CREATE INDEX "IDX_medications_name_trgm"
      ON medications USING GIN (name gin_trgm_ops)
      WHERE deleted_at IS NULL
    `)
    await queryRunner.query(`
      CREATE INDEX "IDX_medications_active_ingredient_trgm"
      ON medications USING GIN (active_ingredient gin_trgm_ops)
      WHERE deleted_at IS NULL
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_medications_active_ingredient_trgm"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_medications_name_trgm"`)
    await queryRunner.query(
      `CREATE INDEX "IDX_medications_active_ingredient" ON medications ("active_ingredient")`,
    )
  }
}
