import { MigrationInterface, QueryRunner } from 'typeorm'

export class RenameDoctorIdToProfessionalIdOnExamRequests1754000000009 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`ALTER TABLE "exam_requests" RENAME COLUMN "doctor_id" TO "professional_id"`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`ALTER TABLE "exam_requests" RENAME COLUMN "professional_id" TO "doctor_id"`)
  }
}
