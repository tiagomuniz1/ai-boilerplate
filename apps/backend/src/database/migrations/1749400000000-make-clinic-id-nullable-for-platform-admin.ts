import { MigrationInterface, QueryRunner } from 'typeorm'

export class MakeClinicIdNullableForPlatformAdmin1749400000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "clinic_id" DROP NOT NULL`)
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "clinic_id" DROP DEFAULT`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    const SEED_CLINIC_ID = '10000000-0000-4000-8000-000000000000'
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "clinic_id" SET DEFAULT '${SEED_CLINIC_ID}'`,
    )
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "clinic_id" SET NOT NULL`)
  }
}
