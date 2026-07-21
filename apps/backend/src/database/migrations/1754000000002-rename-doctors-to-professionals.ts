import { MigrationInterface, QueryRunner } from 'typeorm'

export class RenameDoctorsToProfessionals1754000000002 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`ALTER TABLE "doctors" RENAME TO "professionals"`)

    await queryRunner.query(`DROP INDEX IF EXISTS "doctors_user_id_clinic_active_unique"`)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "professionals_user_id_clinic_active_unique"
        ON "professionals" ("user_id", "clinic_id")
        WHERE "deleted_at" IS NULL
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP INDEX IF EXISTS "professionals_user_id_clinic_active_unique"`)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "doctors_user_id_clinic_active_unique"
        ON "professionals" ("user_id", "clinic_id")
        WHERE "deleted_at" IS NULL
    `)

    await queryRunner.query(`ALTER TABLE "professionals" RENAME TO "doctors"`)
  }
}
