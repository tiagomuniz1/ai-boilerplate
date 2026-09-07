import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Esquema vacinal e a decisão do profissional.
 *
 * `vaccine_schedule_rules` é global como o catálogo, mas com uma diferença de
 * peso: é a fonte de uma afirmação clínica. Editável no backoffice para que
 * mudança de calendário seja curadoria, não deploy.
 *
 * `vaccine_decisions` é o que mantém o sistema no papel de informante: ele
 * aponta a pendência, o profissional resolve, e fica registrado quem e por quê.
 */
export class CreateVaccineScheduleTables1756200000000 implements MigrationInterface {
  name = 'CreateVaccineScheduleTables1756200000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      CREATE TABLE "vaccine_schedule_rules" (
        "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "vaccine_id"        uuid        NOT NULL,
        "dose_label"        varchar(40) NOT NULL,
        "dose_order"        int         NOT NULL,
        "min_age_months"    int         NOT NULL,
        "max_age_months"    int         NULL,
        "min_interval_days" int         NULL,
        "applies_to_gender" varchar(10) NULL,
        "is_active"         boolean     NOT NULL DEFAULT true,
        "created_at"        timestamptz NOT NULL DEFAULT now(),
        "updated_at"        timestamptz NOT NULL DEFAULT now(),
        "deleted_at"        timestamptz NULL,
        CONSTRAINT "FK_vaccine_schedule_rules_vaccine" FOREIGN KEY ("vaccine_id") REFERENCES "vaccines"("id") ON DELETE RESTRICT
      )
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_vaccine_schedule_rules_vaccine" ON "vaccine_schedule_rules" ("vaccine_id")
    `)

    // Duas regras com a mesma ordem na mesma vacina tornariam ambígua a
    // pergunta "qual é a próxima dose".
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_vaccine_schedule_rules_vaccine_order"
      ON "vaccine_schedule_rules" ("vaccine_id", "dose_order") WHERE "deleted_at" IS NULL
    `)

    await queryRunner.query(`
      CREATE TABLE "vaccine_decisions" (
        "id"                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "clinic_id"                   uuid         NOT NULL,
        "patient_id"                  uuid         NOT NULL,
        "vaccine_id"                  uuid         NOT NULL,
        "decision"                    varchar(20)  NOT NULL,
        "reason"                      varchar(500) NULL,
        "decided_by_professional_id"  uuid         NOT NULL,
        "created_at"                  timestamptz  NOT NULL DEFAULT now(),
        "updated_at"                  timestamptz  NOT NULL DEFAULT now(),
        "deleted_at"                  timestamptz  NULL,
        CONSTRAINT "FK_vaccine_decisions_clinic"       FOREIGN KEY ("clinic_id")  REFERENCES "clinics"("id")  ON DELETE RESTRICT,
        CONSTRAINT "FK_vaccine_decisions_patient"      FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_vaccine_decisions_vaccine"      FOREIGN KEY ("vaccine_id") REFERENCES "vaccines"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_vaccine_decisions_professional" FOREIGN KEY ("decided_by_professional_id") REFERENCES "professionals"("id") ON DELETE RESTRICT
      )
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_vaccine_decisions_patient_vaccine"
      ON "vaccine_decisions" ("patient_id", "vaccine_id")
    `)

    // Uma decisão vigente por (paciente, vacina): decidir de novo substitui a
    // anterior, que fica no soft delete como histórico.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_vaccine_decisions_patient_vaccine"
      ON "vaccine_decisions" ("patient_id", "vaccine_id") WHERE "deleted_at" IS NULL
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP TABLE IF EXISTS "vaccine_decisions"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "vaccine_schedule_rules"`)
  }
}
