import { MigrationInterface, QueryRunner } from 'typeorm'

export class RenameDoctorSpecialtyRqeToRegistryNumber1754000000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`ALTER TABLE "doctor_specialties" RENAME COLUMN "rqe" TO "registry_number"`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`ALTER TABLE "doctor_specialties" RENAME COLUMN "registry_number" TO "rqe"`)
  }
}
