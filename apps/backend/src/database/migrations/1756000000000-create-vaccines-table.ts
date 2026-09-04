import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Catálogo global de imunobiológicos. Sem `clinic_id` — é vocabulário da
 * plataforma, como `medications` e `medical_record_canonical_fields`.
 *
 * Sem `source`/`import_hash`: não há importação automática, porque o calendário
 * oficial não é publicado em formato aberto e são dezenas de entradas, curadas
 * no backoffice. Pelo mesmo motivo não há índice trigrama — o `ILIKE` da busca
 * percorre dezenas de linhas, não 36 mil.
 */
export class CreateVaccinesTable1756000000000 implements MigrationInterface {
  name = 'CreateVaccinesTable1756000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      CREATE TABLE "vaccines" (
        "id"                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name"               varchar(120) NOT NULL,
        "abbreviation"       varchar(20)  NULL,
        "prevented_diseases" varchar(250) NULL,
        "is_active"          boolean      NOT NULL DEFAULT true,
        "created_at"         timestamptz  NOT NULL DEFAULT now(),
        "updated_at"         timestamptz  NOT NULL DEFAULT now(),
        "deleted_at"         timestamptz  NULL
      )
    `)

    await queryRunner.query(`CREATE INDEX "IDX_vaccines_name" ON "vaccines" ("name")`)

    // Duas vacinas com o mesmo nome seriam erro de curadoria, e o profissional
    // não teria como distingui-las no seletor. Parcial para não brigar com o
    // soft delete: um nome excluído pode ser recadastrado.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_vaccines_name"
      ON "vaccines" (lower("name")) WHERE "deleted_at" IS NULL
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_vaccines_name"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_vaccines_name"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "vaccines"`)
  }
}
