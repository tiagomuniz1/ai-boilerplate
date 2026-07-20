import { MigrationInterface, QueryRunner } from 'typeorm'

export class RenameDoctorRoleToProfessional1754000000005 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`UPDATE "users" SET "role" = 'professional' WHERE "role" = 'doctor'`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`UPDATE "users" SET "role" = 'doctor' WHERE "role" = 'professional'`)
  }
}
