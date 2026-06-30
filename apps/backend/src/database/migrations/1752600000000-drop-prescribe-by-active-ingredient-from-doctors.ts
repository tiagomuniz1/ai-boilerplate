import { MigrationInterface, QueryRunner } from 'typeorm'

export class DropPrescribeByActiveIngredientFromDoctors1752600000000 implements MigrationInterface {
  name = 'DropPrescribeByActiveIngredientFromDoctors1752600000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)
    await queryRunner.query(`ALTER TABLE "doctors" DROP COLUMN IF EXISTS "prescribe_by_active_ingredient"`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)
    await queryRunner.query(`ALTER TABLE "doctors" ADD COLUMN "prescribe_by_active_ingredient" boolean NOT NULL DEFAULT false`)
  }
}
