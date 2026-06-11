import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAddressToClinics1749500000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      ALTER TABLE "clinics"
        ADD COLUMN "address_street"       VARCHAR(255),
        ADD COLUMN "address_number"       VARCHAR(20),
        ADD COLUMN "address_complement"   VARCHAR(100),
        ADD COLUMN "address_neighborhood" VARCHAR(100),
        ADD COLUMN "address_city"         VARCHAR(100),
        ADD COLUMN "address_state"        VARCHAR(2),
        ADD COLUMN "address_zip_code"     VARCHAR(9),
        ADD COLUMN "address_country"      VARCHAR(2)
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      ALTER TABLE "clinics"
        DROP COLUMN IF EXISTS "address_street",
        DROP COLUMN IF EXISTS "address_number",
        DROP COLUMN IF EXISTS "address_complement",
        DROP COLUMN IF EXISTS "address_neighborhood",
        DROP COLUMN IF EXISTS "address_city",
        DROP COLUMN IF EXISTS "address_state",
        DROP COLUMN IF EXISTS "address_zip_code",
        DROP COLUMN IF EXISTS "address_country"
    `)
  }
}
