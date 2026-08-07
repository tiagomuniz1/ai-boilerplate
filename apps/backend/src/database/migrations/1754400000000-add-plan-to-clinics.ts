import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddPlanToClinics1754400000000 implements MigrationInterface {
  name = 'AddPlanToClinics1754400000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    // NOT NULL DEFAULT 'free': existing rows are backfilled to Free automatically,
    // and the DB default is KEPT (unlike the council-type migration) so a clinic
    // created by any path — the use-case, a seed, raw SQL — is Free by default
    // instead of failing the NOT NULL constraint. Matches the entity's
    // @Column({ default: SubscriptionPlan.FREE }).
    await queryRunner.query(
      `ALTER TABLE "clinics" ADD COLUMN "plan" varchar(20) NOT NULL DEFAULT 'free'`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`ALTER TABLE "clinics" DROP COLUMN IF EXISTS "plan"`)
  }
}
