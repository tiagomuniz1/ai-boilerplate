import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateSchedulesTable1748900000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "schedules" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "doctor_id" UUID NOT NULL,
        "day_of_week" VARCHAR NOT NULL,
        "start_time" VARCHAR NOT NULL,
        "end_time" VARCHAR NOT NULL,
        "slot_duration_in_minutes" INTEGER NOT NULL,
        "valid_from" VARCHAR,
        "valid_until" VARCHAR,
        "version" INTEGER NOT NULL DEFAULT 1,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_schedules" PRIMARY KEY ("id"),
        CONSTRAINT "FK_schedules_doctor" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id")
      )
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)
    await queryRunner.query('DROP TABLE IF EXISTS "schedules"')
  }
}
