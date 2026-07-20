import { MigrationInterface, QueryRunner } from 'typeorm'

export class RenameDoctorIdToProfessionalIdOnMedicalCertificates1754000000010 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`ALTER TABLE "medical_certificates" RENAME COLUMN "doctor_id" TO "professional_id"`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`ALTER TABLE "medical_certificates" RENAME COLUMN "professional_id" TO "doctor_id"`)
  }
}
