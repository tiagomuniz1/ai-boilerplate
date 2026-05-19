import { MigrationInterface, QueryRunner } from 'typeorm'

export class LinkPatientsToUsers1748200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      ALTER TABLE patients
        ADD COLUMN IF NOT EXISTS user_id UUID
    `)

    // Remove orphaned patient rows that cannot be linked
    await queryRunner.query(`
      DELETE FROM patients WHERE user_id IS NULL
    `)

    await queryRunner.query(`
      ALTER TABLE patients
        ALTER COLUMN user_id SET NOT NULL
    `)

    await queryRunner.query(`
      ALTER TABLE patients
        ADD CONSTRAINT fk_patients_user_id
        FOREIGN KEY (user_id) REFERENCES users(id)
    `)

    await queryRunner.query(`
      ALTER TABLE patients
        DROP COLUMN IF EXISTS full_name,
        DROP COLUMN IF EXISTS email
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      ALTER TABLE patients
        ADD COLUMN IF NOT EXISTS full_name VARCHAR NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS email VARCHAR NOT NULL DEFAULT ''
    `)

    await queryRunner.query(`
      ALTER TABLE patients
        DROP CONSTRAINT IF EXISTS fk_patients_user_id
    `)

    await queryRunner.query(`
      ALTER TABLE patients
        DROP COLUMN IF EXISTS user_id
    `)
  }
}
