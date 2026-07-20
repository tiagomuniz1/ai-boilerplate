import { MigrationInterface, QueryRunner } from 'typeorm'

export class RenameDoctorIdToProfessionalIdOnPrescriptions1754000000013 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`ALTER TABLE "prescriptions" RENAME COLUMN "doctor_id" TO "professional_id"`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`ALTER TABLE "prescriptions" RENAME COLUMN "professional_id" TO "doctor_id"`)
  }
}
