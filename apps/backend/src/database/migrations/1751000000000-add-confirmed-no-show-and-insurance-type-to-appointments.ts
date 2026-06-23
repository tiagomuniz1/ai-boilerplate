import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddConfirmedNoShowAndInsuranceTypeToAppointments1751000000000 implements MigrationInterface {
  name = 'AddConfirmedNoShowAndInsuranceTypeToAppointments1751000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)
    await queryRunner.query(`ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "insurance_type" varchar NULL DEFAULT NULL`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)
    await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN IF EXISTS "insurance_type"`)
  }
}
