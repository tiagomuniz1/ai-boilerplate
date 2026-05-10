import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreatePatientsTable1747000000000 implements MigrationInterface {
  name = 'CreatePatientsTable1747000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "patients" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "full_name" varchar(120) NOT NULL,
        "document_number" char(11) NOT NULL,
        "email" varchar NOT NULL,
        "phone_number" varchar(20) NOT NULL,
        "birth_date" date NOT NULL,
        "gender" varchar(10) NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_patients" PRIMARY KEY ("id")
      )
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "patients_document_number_active_unique"
      ON "patients"("document_number")
      WHERE "deleted_at" IS NULL
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)
    await queryRunner.query(`DROP INDEX IF EXISTS "patients_document_number_active_unique"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "patients"`)
  }
}
