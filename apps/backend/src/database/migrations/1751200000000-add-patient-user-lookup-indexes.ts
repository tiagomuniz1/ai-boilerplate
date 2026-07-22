import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddPatientUserLookupIndexes1751200000000 implements MigrationInterface {
  name = 'AddPatientUserLookupIndexes1751200000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    // Covers patients.findAll which paginates by clinic_id ordered by created_at.
    // Composite (clinic_id, created_at) lets PostgreSQL skip the sort for ORDER BY.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_patients_clinic_created_at"
      ON patients (clinic_id, created_at DESC)
      WHERE deleted_at IS NULL
    `)

    // Covers patients.findByUserId — called on every login/auth flow to resolve
    // the patient profile from the authenticated user_id.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_patients_user_id"
      ON patients (user_id)
      WHERE deleted_at IS NULL
    `)

    // Covers users.findAll which paginates by clinic ordered by created_at.
    // The composite (clinic_id, created_at DESC) allows an Index Scan that stops after LIMIT rows
    // without a sort step, and also serves indirect joins from patients/doctors/schedules.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_clinic_id"
      ON users (clinic_id)
      WHERE deleted_at IS NULL
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_clinic_created_at"
      ON users (clinic_id, created_at DESC)
      WHERE deleted_at IS NULL
    `)

    // Covers schedules.findActiveByProfessionalAndDate, findOverlapping and deleteAllByProfessionalId —
    // called on every appointment booking to resolve available slots.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_schedules_doctor_id"
      ON schedules (doctor_id)
      WHERE deleted_at IS NULL
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_patients_clinic_created_at"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_patients_user_id"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_clinic_id"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_clinic_created_at"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_schedules_doctor_id"`)
  }
}
