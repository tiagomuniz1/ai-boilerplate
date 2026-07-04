import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateExamResultsTable1753000000000 implements MigrationInterface {
  name = 'CreateExamResultsTable1753000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      CREATE TABLE "exam_results" (
        "id"                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        "clinic_id"           uuid        NOT NULL,
        "exam_request_id"     uuid        NOT NULL,
        "file_path"           text        NOT NULL,
        "file_name"           varchar(255) NOT NULL,
        "mime_type"           varchar(100) NOT NULL,
        "file_size_bytes"     integer     NOT NULL,
        "uploaded_by_user_id" uuid        NOT NULL,
        "created_at"          timestamptz NOT NULL DEFAULT now(),
        "updated_at"          timestamptz NOT NULL DEFAULT now(),
        "deleted_at"          timestamptz NULL
      )
    `)

    await queryRunner.query(`CREATE INDEX "IDX_exam_results_exam_request_id" ON "exam_results" ("exam_request_id")`)
    await queryRunner.query(`CREATE INDEX "IDX_exam_results_clinic_id" ON "exam_results" ("clinic_id")`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_exam_results_clinic_id"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_exam_results_exam_request_id"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "exam_results"`)
  }
}
