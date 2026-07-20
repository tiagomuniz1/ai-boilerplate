import { MigrationInterface, QueryRunner } from 'typeorm'

export class RenameDoctorSpecialtiesToProfessionalSpecialties1754000000004 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`ALTER TABLE "doctor_specialties" RENAME TO "professional_specialties"`)
    await queryRunner.query(`ALTER TABLE "professional_specialties" RENAME COLUMN "doctor_id" TO "professional_id"`)

    await queryRunner.query(`ALTER TABLE "professional_specialties" RENAME CONSTRAINT "PK_doctor_specialties" TO "PK_professional_specialties"`)
    await queryRunner.query(`ALTER TABLE "professional_specialties" RENAME CONSTRAINT "FK_doctor_specialties_doctor" TO "FK_professional_specialties_professional"`)
    await queryRunner.query(`ALTER TABLE "professional_specialties" RENAME CONSTRAINT "FK_doctor_specialties_specialty" TO "FK_professional_specialties_specialty"`)
    await queryRunner.query(`ALTER TABLE "professional_specialties" RENAME CONSTRAINT "UQ_doctor_specialties_doctor_specialty" TO "UQ_professional_specialties_professional_specialty"`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`ALTER TABLE "professional_specialties" RENAME CONSTRAINT "UQ_professional_specialties_professional_specialty" TO "UQ_doctor_specialties_doctor_specialty"`)
    await queryRunner.query(`ALTER TABLE "professional_specialties" RENAME CONSTRAINT "FK_professional_specialties_specialty" TO "FK_doctor_specialties_specialty"`)
    await queryRunner.query(`ALTER TABLE "professional_specialties" RENAME CONSTRAINT "FK_professional_specialties_professional" TO "FK_doctor_specialties_doctor"`)
    await queryRunner.query(`ALTER TABLE "professional_specialties" RENAME CONSTRAINT "PK_professional_specialties" TO "PK_doctor_specialties"`)

    await queryRunner.query(`ALTER TABLE "professional_specialties" RENAME COLUMN "professional_id" TO "doctor_id"`)
    await queryRunner.query(`ALTER TABLE "professional_specialties" RENAME TO "doctor_specialties"`)
  }
}
