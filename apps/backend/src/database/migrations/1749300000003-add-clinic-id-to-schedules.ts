import { MigrationInterface, QueryRunner } from 'typeorm'

const SEED_CLINIC_ID = '10000000-0000-4000-8000-000000000000'

export class AddClinicIdToSchedules1749300000003 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      ALTER TABLE "schedules"
        ADD COLUMN "clinic_id" UUID NOT NULL DEFAULT '${SEED_CLINIC_ID}'
        REFERENCES "clinics"("id")
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)
    await queryRunner.query(`ALTER TABLE "schedules" DROP COLUMN IF EXISTS "clinic_id"`)
  }
}
