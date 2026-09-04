import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Indicação de vacina — documento emitido, no molde do atestado.
 *
 * `appointment_id` é NOT NULL, ao contrário do registro de vacinação. Registrar
 * é transcrever o que a paciente já tomou, e isso frequentemente não tem
 * consulta a que amarrar; indicar é ato de consulta, e o documento sai assinado
 * por quem atendeu.
 */
export class CreateVaccineIndications1756400000000 implements MigrationInterface {
  name = 'CreateVaccineIndications1756400000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      CREATE TABLE "vaccine_indications" (
        "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "clinic_id"       uuid        NOT NULL,
        "appointment_id"  uuid        NOT NULL,
        "patient_id"      uuid        NOT NULL,
        "professional_id" uuid        NOT NULL,
        "snapshot"        jsonb       NOT NULL,
        "issued_at"       timestamptz NOT NULL,
        "created_at"      timestamptz NOT NULL DEFAULT now(),
        "updated_at"      timestamptz NOT NULL DEFAULT now(),
        "deleted_at"      timestamptz NULL,
        CONSTRAINT "FK_vaccine_indications_clinic"       FOREIGN KEY ("clinic_id")       REFERENCES "clinics"("id")       ON DELETE RESTRICT,
        CONSTRAINT "FK_vaccine_indications_appointment"  FOREIGN KEY ("appointment_id")  REFERENCES "appointments"("id")  ON DELETE RESTRICT,
        CONSTRAINT "FK_vaccine_indications_patient"      FOREIGN KEY ("patient_id")      REFERENCES "patients"("id")      ON DELETE RESTRICT,
        CONSTRAINT "FK_vaccine_indications_professional" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE RESTRICT
      )
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_vaccine_indications_appointment"
      ON "vaccine_indications" ("appointment_id")
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_vaccine_indications_patient"
      ON "vaccine_indications" ("patient_id")
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)
    await queryRunner.query(`DROP TABLE IF EXISTS "vaccine_indications"`)
  }
}
