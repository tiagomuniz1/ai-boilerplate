import { MigrationInterface, QueryRunner } from 'typeorm'

export class RenameDoctorIdToProfessionalIdOnSchedules1754000000007 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`ALTER TABLE "schedules" RENAME COLUMN "doctor_id" TO "professional_id"`)
    await queryRunner.query(`ALTER TABLE "schedules" RENAME CONSTRAINT "FK_schedules_doctor" TO "FK_schedules_professional"`)
    await queryRunner.query(`ALTER INDEX "IDX_schedules_doctor_id" RENAME TO "IDX_schedules_professional_id"`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`ALTER INDEX "IDX_schedules_professional_id" RENAME TO "IDX_schedules_doctor_id"`)
    await queryRunner.query(`ALTER TABLE "schedules" RENAME CONSTRAINT "FK_schedules_professional" TO "FK_schedules_doctor"`)
    await queryRunner.query(`ALTER TABLE "schedules" RENAME COLUMN "professional_id" TO "doctor_id"`)
  }
}
