import { MigrationInterface, QueryRunner } from 'typeorm'

const SEED_CLINIC_ID = '10000000-0000-4000-8000-000000000000'

export class AddClinicIdToUsers1749300000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      INSERT INTO "clinics" ("id", "name", "slug", "is_active", "version")
      VALUES ('${SEED_CLINIC_ID}', 'Default Clinic', 'default', true, 1)
      ON CONFLICT ("id") DO NOTHING
    `)

    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "clinic_id" UUID NOT NULL DEFAULT '${SEED_CLINIC_ID}'
        REFERENCES "clinics"("id")
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "clinic_id"`)
  }
}
