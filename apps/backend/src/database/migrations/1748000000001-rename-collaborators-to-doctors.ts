import { MigrationInterface, QueryRunner } from 'typeorm'

export class RenameCollaboratorsToDoctors1748000000001 implements MigrationInterface {
  name = 'RenameCollaboratorsToDoctors1748000000001'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)
    await queryRunner.query(`ALTER TABLE "collaborators" RENAME TO "doctors"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "collaborators_user_id_active_unique"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "collaborators_crm_number_active_unique"`)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "doctors_user_id_active_unique"
      ON "doctors"("user_id")
      WHERE "deleted_at" IS NULL
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "doctors_crm_number_active_unique"
      ON "doctors"("crm_number")
      WHERE "deleted_at" IS NULL
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)
    await queryRunner.query(`DROP INDEX IF EXISTS "doctors_crm_number_active_unique"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "doctors_user_id_active_unique"`)
    await queryRunner.query(`ALTER TABLE "doctors" RENAME TO "collaborators"`)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "collaborators_user_id_active_unique"
      ON "collaborators"("user_id")
      WHERE "deleted_at" IS NULL
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "collaborators_crm_number_active_unique"
      ON "collaborators"("crm_number")
      WHERE "deleted_at" IS NULL
    `)
  }
}
