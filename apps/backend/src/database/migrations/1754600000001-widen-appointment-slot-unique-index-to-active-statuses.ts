import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * The slot uniqueness guard only covered status = 'scheduled', so a *confirmed*
 * appointment did not hold its slot: it reappeared as free in the availability
 * endpoint and could be double-booked without violating the index. Rare for a
 * single booking, near-certain across a long recurring series.
 *
 * Before running this in an environment with real data, check for rows that
 * would violate the wider index — creating it fails if any exist:
 *
 *   SELECT clinic_id, professional_id, date, start_time, count(*)
 *   FROM appointments
 *   WHERE status IN ('scheduled','confirmed') AND deleted_at IS NULL
 *   GROUP BY 1,2,3,4 HAVING count(*) > 1;
 */
export class WidenAppointmentSlotUniqueIndexToActiveStatuses1754600000001
  implements MigrationInterface
{
  name = 'WidenAppointmentSlotUniqueIndexToActiveStatuses1754600000001'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_appointment_slot_scheduled"`)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_appointment_slot_active"
      ON "appointments" ("clinic_id", "professional_id", "date", "start_time")
      WHERE status IN ('scheduled', 'confirmed') AND deleted_at IS NULL
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_appointment_slot_active"`)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_appointment_slot_scheduled"
      ON "appointments" ("clinic_id", "professional_id", "date", "start_time")
      WHERE status = 'scheduled' AND deleted_at IS NULL
    `)
  }
}
