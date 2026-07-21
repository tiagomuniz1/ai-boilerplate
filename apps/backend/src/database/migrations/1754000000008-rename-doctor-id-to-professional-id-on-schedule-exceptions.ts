import { MigrationInterface, QueryRunner } from 'typeorm'

export class RenameDoctorIdToProfessionalIdOnScheduleExceptions1754000000008 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`ALTER TABLE "schedule_exceptions" RENAME COLUMN "doctor_id" TO "professional_id"`)
    await queryRunner.query(`ALTER TABLE "schedule_exceptions" RENAME CONSTRAINT "schedule_exceptions_doctor_id_fkey" TO "schedule_exceptions_professional_id_fkey"`)
    await queryRunner.query(`ALTER INDEX "IDX_schedule_exceptions_clinic_doctor_date" RENAME TO "IDX_schedule_exceptions_clinic_professional_date"`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`ALTER INDEX "IDX_schedule_exceptions_clinic_professional_date" RENAME TO "IDX_schedule_exceptions_clinic_doctor_date"`)
    await queryRunner.query(`ALTER TABLE "schedule_exceptions" RENAME CONSTRAINT "schedule_exceptions_professional_id_fkey" TO "schedule_exceptions_doctor_id_fkey"`)
    await queryRunner.query(`ALTER TABLE "schedule_exceptions" RENAME COLUMN "professional_id" TO "doctor_id"`)
  }
}
