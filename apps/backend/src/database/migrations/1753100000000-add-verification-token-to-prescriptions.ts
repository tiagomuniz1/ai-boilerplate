import { randomBytes } from 'crypto'
import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddVerificationTokenToPrescriptions1753100000000 implements MigrationInterface {
  name = 'AddVerificationTokenToPrescriptions1753100000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    // 1. coluna nullable para permitir backfill
    await queryRunner.query(`ALTER TABLE "prescriptions" ADD COLUMN "verification_token" varchar(64) NULL`)

    // 2. backfill de todas as linhas existentes (inclusive soft-deleted) com token único
    const rows: Array<{ id: string }> = await queryRunner.query(
      `SELECT "id" FROM "prescriptions" WHERE "verification_token" IS NULL`,
    )
    for (const row of rows) {
      const token = randomBytes(32).toString('hex')
      await queryRunner.query(`UPDATE "prescriptions" SET "verification_token" = $1 WHERE "id" = $2`, [
        token,
        row.id,
      ])
    }

    // 3. tornar obrigatória + índice único
    await queryRunner.query(`ALTER TABLE "prescriptions" ALTER COLUMN "verification_token" SET NOT NULL`)
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_prescriptions_verification_token" ON "prescriptions" ("verification_token")`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_prescriptions_verification_token"`)
    await queryRunner.query(`ALTER TABLE "prescriptions" DROP COLUMN IF EXISTS "verification_token"`)
  }
}
