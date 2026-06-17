import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateClinicSpecialtiesTable1750200000000 implements MigrationInterface {
  name = 'CreateClinicSpecialtiesTable1750200000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      CREATE TABLE "clinic_specialties" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "clinic_id" UUID NOT NULL,
        "specialty_id" UUID NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_clinic_specialties" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_clinic_specialty" UNIQUE ("clinic_id", "specialty_id"),
        CONSTRAINT "FK_clinic_specialties_clinic" FOREIGN KEY ("clinic_id")
          REFERENCES "clinics"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_clinic_specialties_specialty" FOREIGN KEY ("specialty_id")
          REFERENCES "specialties"("id") ON DELETE RESTRICT
      )
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP TABLE IF EXISTS "clinic_specialties"`)
  }
}
