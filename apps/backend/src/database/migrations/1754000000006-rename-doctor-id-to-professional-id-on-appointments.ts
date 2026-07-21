import { MigrationInterface, QueryRunner } from 'typeorm'

export class RenameDoctorIdToProfessionalIdOnAppointments1754000000006 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`ALTER TABLE "appointments" RENAME COLUMN "doctor_id" TO "professional_id"`)
    await queryRunner.query(`ALTER TABLE "appointments" RENAME CONSTRAINT "appointments_doctor_id_fkey" TO "appointments_professional_id_fkey"`)
    await queryRunner.query(`ALTER INDEX "IDX_appointments_clinic_doctor_date" RENAME TO "IDX_appointments_clinic_professional_date"`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`ALTER INDEX "IDX_appointments_clinic_professional_date" RENAME TO "IDX_appointments_clinic_doctor_date"`)
    await queryRunner.query(`ALTER TABLE "appointments" RENAME CONSTRAINT "appointments_professional_id_fkey" TO "appointments_doctor_id_fkey"`)
    await queryRunner.query(`ALTER TABLE "appointments" RENAME COLUMN "professional_id" TO "doctor_id"`)
  }
}
