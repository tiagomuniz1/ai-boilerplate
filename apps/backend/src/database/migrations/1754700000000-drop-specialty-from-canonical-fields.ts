import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * The canonical medical-record field catalogue is global: every field is
 * available to every professional, whatever their profession or specialty.
 *
 * The `specialty_id` scope it used to carry only ever narrowed the picker in the
 * template builder, and it narrowed it wrongly. Templates are scoped by
 * specialty OR by councilType, but a canonical field could only be scoped by
 * specialty — so the fields written for non-medical professions pointed at
 * specialties the catalogue does not define ("Nutrição Clínica",
 * "Fisioterapia Ortopédica") and were silently dropped on every import. It also
 * hid specialty-scoped fields from the backoffice catalogue screen, which lists
 * without a specialty filter and therefore only ever matched `IS NULL`.
 *
 * `down` restores the column, the FK and the index, but NOT the values — the
 * scope of any field that had one is lost. At the time of writing exactly one
 * row carried a scope (`risk_level` → Cardiologia), which becomes general.
 */
export class DropSpecialtyFromCanonicalFields1754700000000 implements MigrationInterface {
  name = 'DropSpecialtyFromCanonicalFields1754700000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_canonical_fields_specialty"`)
    await queryRunner.query(`
      ALTER TABLE "medical_record_canonical_fields"
      DROP CONSTRAINT IF EXISTS "FK_canonical_fields_specialty"
    `)
    await queryRunner.query(`
      ALTER TABLE "medical_record_canonical_fields"
      DROP COLUMN IF EXISTS "specialty_id"
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      ALTER TABLE "medical_record_canonical_fields"
      ADD COLUMN IF NOT EXISTS "specialty_id" UUID
    `)
    await queryRunner.query(`
      ALTER TABLE "medical_record_canonical_fields"
      ADD CONSTRAINT "FK_canonical_fields_specialty"
      FOREIGN KEY ("specialty_id") REFERENCES "specialties"("id") ON DELETE RESTRICT
    `)
    await queryRunner.query(`
      CREATE INDEX "IDX_canonical_fields_specialty"
      ON "medical_record_canonical_fields" ("specialty_id")
    `)
  }
}
