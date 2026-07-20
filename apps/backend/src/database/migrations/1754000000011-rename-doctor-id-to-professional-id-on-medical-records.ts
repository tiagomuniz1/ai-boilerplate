import { MigrationInterface, QueryRunner } from 'typeorm'

export class RenameDoctorIdToProfessionalIdOnMedicalRecords1754000000011 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`ALTER TABLE "medical_records" RENAME COLUMN "doctor_id" TO "professional_id"`)
    await queryRunner.query(`ALTER TABLE "medical_records" RENAME CONSTRAINT "medical_records_doctor_id_fkey" TO "medical_records_professional_id_fkey"`)
    await queryRunner.query(`ALTER INDEX "IDX_medical_records_clinic_doctor" RENAME TO "IDX_medical_records_clinic_professional"`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`ALTER INDEX "IDX_medical_records_clinic_professional" RENAME TO "IDX_medical_records_clinic_doctor"`)
    await queryRunner.query(`ALTER TABLE "medical_records" RENAME CONSTRAINT "medical_records_professional_id_fkey" TO "medical_records_doctor_id_fkey"`)
    await queryRunner.query(`ALTER TABLE "medical_records" RENAME COLUMN "professional_id" TO "doctor_id"`)
  }
}
