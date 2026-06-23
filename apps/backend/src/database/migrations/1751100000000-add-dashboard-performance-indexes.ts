import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddDashboardPerformanceIndexes1751100000000 implements MigrationInterface {
  name = 'AddDashboardPerformanceIndexes1751100000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    // Covers all dashboard queries that filter by clinic_id + date range + status.
    // Replaces the Seq Scan on 4M appointments rows for countByStatus,
    // getCompletedCountByDay, getProceduresBySpecialty and getAgeDistribution.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_appointments_clinic_date_status"
      ON appointments (clinic_id, date, status)
      WHERE deleted_at IS NULL
    `)

    // Covers the getPatientStats first_appts CTE which looks up the earliest
    // appointment date per patient across all clinic history (no date filter).
    // Including status and date in the index avoids a secondary heap fetch.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_appointments_clinic_patient_status_date"
      ON appointments (clinic_id, patient_id, status, date)
      WHERE deleted_at IS NULL
    `)

    // Covers getTodayBirthdays which queries patients directly by clinic + birth month/day.
    // clinic_id is the leading column so PostgreSQL can seek (clinic=X, month=M, day=D).
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_patients_birth_month_day"
      ON patients (
        clinic_id,
        date_part('month', CAST(birth_date AS date)),
        date_part('day',   CAST(birth_date AS date))
      )
      WHERE deleted_at IS NULL
    `)

    // Covers the getPatientStats first_appts CTE which computes MIN(date) per patient
    // across all clinic history excluding cancelled appointments.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_appointments_clinic_patient_date_noncancelled"
      ON appointments (clinic_id, patient_id, date)
      WHERE deleted_at IS NULL AND status != 'cancelled'
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_appointments_clinic_date_status"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_appointments_clinic_patient_status_date"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_patients_birth_month_day"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_appointments_clinic_patient_date_noncancelled"`)
  }
}
