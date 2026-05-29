import { MigrationInterface, QueryRunner } from 'typeorm'

export class MigrateDoctorSpecialtyToManyToMany1749100000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "doctor_specialties" (
        "doctor_id" uuid NOT NULL,
        "specialty_id" uuid NOT NULL,
        CONSTRAINT "PK_doctor_specialties" PRIMARY KEY ("doctor_id", "specialty_id"),
        CONSTRAINT "FK_doctor_specialties_doctor" FOREIGN KEY ("doctor_id")
          REFERENCES "doctors"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_doctor_specialties_specialty" FOREIGN KEY ("specialty_id")
          REFERENCES "specialties"("id")
      )
    `)

    const doctors = await queryRunner.query(
      `SELECT id, specialty FROM "doctors" WHERE specialty IS NOT NULL AND specialty != ''`,
    )

    for (const doctor of doctors) {
      const specialtyName = doctor.specialty.trim()

      let [specialty] = await queryRunner.query(
        `SELECT id FROM "specialties" WHERE LOWER(name) = LOWER($1) AND deleted_at IS NULL LIMIT 1`,
        [specialtyName],
      )

      if (!specialty) {
        const [created] = await queryRunner.query(
          `INSERT INTO "specialties" (name) VALUES ($1) RETURNING id`,
          [specialtyName],
        )
        specialty = created
      }

      await queryRunner.query(
        `INSERT INTO "doctor_specialties" (doctor_id, specialty_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [doctor.id, specialty.id],
      )
    }

    await queryRunner.query(`ALTER TABLE "doctors" DROP COLUMN IF EXISTS "specialty"`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "specialty" varchar`)

    const rows = await queryRunner.query(`
      SELECT ds.doctor_id, s.name
      FROM "doctor_specialties" ds
      JOIN "specialties" s ON s.id = ds.specialty_id
    `)

    for (const row of rows) {
      await queryRunner.query(
        `UPDATE "doctors" SET specialty = $1 WHERE id = $2`,
        [row.name, row.doctor_id],
      )
    }

    await queryRunner.query(`DROP TABLE IF EXISTS "doctor_specialties"`)
  }
}
