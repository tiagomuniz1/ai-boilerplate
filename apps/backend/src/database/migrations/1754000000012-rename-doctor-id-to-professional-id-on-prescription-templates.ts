import { MigrationInterface, QueryRunner } from 'typeorm'

export class RenameDoctorIdToProfessionalIdOnPrescriptionTemplates1754000000012 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`ALTER TABLE "prescription_templates" RENAME COLUMN "doctor_id" TO "professional_id"`)
    await queryRunner.query(`ALTER TABLE "prescription_templates" RENAME COLUMN "doctor_name" TO "professional_name"`)
    await queryRunner.query(`ALTER INDEX "IDX_prescription_templates_clinic_doctor" RENAME TO "IDX_prescription_templates_clinic_professional"`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`ALTER INDEX "IDX_prescription_templates_clinic_professional" RENAME TO "IDX_prescription_templates_clinic_doctor"`)
    await queryRunner.query(`ALTER TABLE "prescription_templates" RENAME COLUMN "professional_name" TO "doctor_name"`)
    await queryRunner.query(`ALTER TABLE "prescription_templates" RENAME COLUMN "professional_id" TO "doctor_id"`)
  }
}
