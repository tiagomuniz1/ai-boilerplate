import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAppointmentRemindersTable1754500000000 implements MigrationInterface {
  name = 'CreateAppointmentRemindersTable1754500000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      CREATE TABLE "appointment_reminders" (
        "id"                  uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        "appointment_id"      uuid         NOT NULL,
        "clinic_id"           uuid         NOT NULL,
        "offset_label"        varchar(10)  NOT NULL,
        "channel"             varchar(20)  NOT NULL,
        "status"              varchar(20)  NOT NULL,
        "provider_message_id" varchar(255) NULL,
        "error"               varchar(500) NULL,
        "created_at"          timestamptz  NOT NULL DEFAULT now(),
        "updated_at"          timestamptz  NOT NULL DEFAULT now()
      )
    `)

    // Send-once guarantee: one reminder per (appointment, offset). Claimed via
    // INSERT ... ON CONFLICT DO NOTHING, so two app instances can never double-send.
    await queryRunner.query(
      `ALTER TABLE "appointment_reminders" ADD CONSTRAINT "UQ_appointment_reminders_appointment_offset" UNIQUE ("appointment_id", "offset_label")`,
    )
    await queryRunner.query(
      `CREATE INDEX "IDX_appointment_reminders_appointment_id" ON "appointment_reminders" ("appointment_id")`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_appointment_reminders_appointment_id"`)
    await queryRunner.query(
      `ALTER TABLE "appointment_reminders" DROP CONSTRAINT IF EXISTS "UQ_appointment_reminders_appointment_offset"`,
    )
    await queryRunner.query(`DROP TABLE IF EXISTS "appointment_reminders"`)
  }
}
