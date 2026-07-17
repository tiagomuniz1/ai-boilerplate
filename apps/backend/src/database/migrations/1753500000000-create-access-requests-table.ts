import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAccessRequestsTable1753500000000 implements MigrationInterface {
  name = 'CreateAccessRequestsTable1753500000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      CREATE TABLE "access_requests" (
        "id"          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        "full_name"   varchar     NOT NULL,
        "email"       varchar     NOT NULL,
        "clinic_name" varchar     NOT NULL,
        "phone"       varchar     NULL,
        "created_at"  timestamptz NOT NULL DEFAULT now(),
        "deleted_at"  timestamptz NULL
      )
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP TABLE IF EXISTS "access_requests"`)
  }
}
