import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Caderneta de vacinação, ancorada no PACIENTE.
 *
 * `appointment_id` é NULO por decisão de modelagem, e é a única entidade
 * clínica do sistema assim: dose aplicada anos atrás em outro serviço não tem
 * consulta a que se amarrar. `recorded_by_professional_id` continua obrigatório
 * — sempre há alguém com ficha respondendo pelo registro.
 */
export class CreateVaccinationsTable1756100000000 implements MigrationInterface {
  name = 'CreateVaccinationsTable1756100000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      CREATE TABLE "vaccinations" (
        "id"                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "clinic_id"                   uuid         NOT NULL,
        "patient_id"                  uuid         NOT NULL,
        "vaccine_id"                  uuid         NOT NULL,
        "appointment_id"              uuid         NULL,
        "recorded_by_professional_id" uuid         NOT NULL,
        "dose_label"                  varchar(40)  NOT NULL,
        "applied_at"                  date         NOT NULL,
        "applied_at_our_clinic"       boolean      NOT NULL DEFAULT false,
        "applied_at_description"      varchar(160) NULL,
        "lot_number"                  varchar(80)  NULL,
        "manufacturer"                varchar(80)  NULL,
        "notes"                       text         NULL,
        "created_at"                  timestamptz  NOT NULL DEFAULT now(),
        "updated_at"                  timestamptz  NOT NULL DEFAULT now(),
        "deleted_at"                  timestamptz  NULL,
        CONSTRAINT "FK_vaccinations_clinic"       FOREIGN KEY ("clinic_id")   REFERENCES "clinics"("id")   ON DELETE RESTRICT,
        CONSTRAINT "FK_vaccinations_patient"      FOREIGN KEY ("patient_id")  REFERENCES "patients"("id")  ON DELETE RESTRICT,
        CONSTRAINT "FK_vaccinations_vaccine"      FOREIGN KEY ("vaccine_id")  REFERENCES "vaccines"("id")  ON DELETE RESTRICT,
        CONSTRAINT "FK_vaccinations_professional" FOREIGN KEY ("recorded_by_professional_id") REFERENCES "professionals"("id") ON DELETE RESTRICT
      )
    `)

    // A leitura real é sempre "a caderneta deste paciente, mais recente
    // primeiro" — o índice atende ao WHERE e ao ORDER BY de uma vez.
    await queryRunner.query(`
      CREATE INDEX "IDX_vaccinations_patient_applied_at"
      ON "vaccinations" ("patient_id", "applied_at" DESC)
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_vaccinations_appointment_id"
      ON "vaccinations" ("appointment_id") WHERE "appointment_id" IS NOT NULL
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_vaccinations_appointment_id"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_vaccinations_patient_applied_at"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "vaccinations"`)
  }
}
