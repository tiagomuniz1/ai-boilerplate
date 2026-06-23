import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddTrigramIndexes1751300000000 implements MigrationInterface {
  name = 'AddTrigramIndexes1751300000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // pg_trgm is a database-level extension — must be created in public before setting
    // the app schema as the search_path; otherwise gin_trgm_ops won't resolve.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA public`)

    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    // Covers users.findAll search and patients.findAll name search.
    // Both filter by users.full_name ILIKE '%text%'.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_full_name_trgm"
      ON users USING GIN (full_name gin_trgm_ops)
      WHERE deleted_at IS NULL
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_full_name_trgm"`)
  }
}
