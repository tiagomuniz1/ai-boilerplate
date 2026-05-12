import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateCollaboratorsTable1748000000000 implements MigrationInterface {
  name = 'CreateCollaboratorsTable1748000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "collaborators" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "crm_number" varchar(12) NOT NULL,
        "specialty" varchar(100) NOT NULL,
        "bio" text,
        "version" integer NOT NULL DEFAULT 1,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_collaborators" PRIMARY KEY ("id"),
        CONSTRAINT "FK_collaborators_user" FOREIGN KEY ("user_id") REFERENCES "users"("id")
      )
    `)
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

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)
    await queryRunner.query(`DROP INDEX IF EXISTS "collaborators_crm_number_active_unique"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "collaborators_user_id_active_unique"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "collaborators"`)
  }
}
