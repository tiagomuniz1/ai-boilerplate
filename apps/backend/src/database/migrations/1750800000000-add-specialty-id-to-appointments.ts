import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddSpecialtyIdToAppointments1750800000000 implements MigrationInterface {
  name = 'AddSpecialtyIdToAppointments1750800000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      ALTER TABLE "appointments"
        ADD COLUMN "specialty_id" UUID,
        ADD CONSTRAINT "FK_appointments_specialty" FOREIGN KEY ("specialty_id")
          REFERENCES "specialties"("id") ON DELETE RESTRICT
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_appointments_specialty"
        ON "appointments" ("specialty_id")
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_appointments_specialty"`)
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "FK_appointments_specialty"`,
    )
    await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN IF EXISTS "specialty_id"`)
  }
}
