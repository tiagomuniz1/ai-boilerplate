import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddRqeToDoctorSpecialties1752700000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`ALTER TABLE "doctor_specialties" ADD COLUMN IF NOT EXISTS "id" uuid NOT NULL DEFAULT uuid_generate_v4()`)
    await queryRunner.query(`ALTER TABLE "doctor_specialties" ADD COLUMN IF NOT EXISTS "rqe" varchar(10) NULL`)
    await queryRunner.query(`ALTER TABLE "doctor_specialties" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()`)

    await queryRunner.query(`ALTER TABLE "doctor_specialties" DROP CONSTRAINT IF EXISTS "PK_doctor_specialties"`)
    await queryRunner.query(`ALTER TABLE "doctor_specialties" ADD CONSTRAINT "PK_doctor_specialties" PRIMARY KEY ("id")`)
    await queryRunner.query(`
      ALTER TABLE "doctor_specialties"
        ADD CONSTRAINT "UQ_doctor_specialties_doctor_specialty" UNIQUE ("doctor_id", "specialty_id")
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`ALTER TABLE "doctor_specialties" DROP CONSTRAINT IF EXISTS "UQ_doctor_specialties_doctor_specialty"`)
    await queryRunner.query(`ALTER TABLE "doctor_specialties" DROP CONSTRAINT IF EXISTS "PK_doctor_specialties"`)
    await queryRunner.query(`ALTER TABLE "doctor_specialties" ADD CONSTRAINT "PK_doctor_specialties" PRIMARY KEY ("doctor_id", "specialty_id")`)

    await queryRunner.query(`ALTER TABLE "doctor_specialties" DROP COLUMN IF EXISTS "created_at"`)
    await queryRunner.query(`ALTER TABLE "doctor_specialties" DROP COLUMN IF EXISTS "rqe"`)
    await queryRunner.query(`ALTER TABLE "doctor_specialties" DROP COLUMN IF EXISTS "id"`)
  }
}
