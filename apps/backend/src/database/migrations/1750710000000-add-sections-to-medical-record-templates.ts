import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddSectionsToMedicalRecordTemplates1750710000000 implements MigrationInterface {
  name = 'AddSectionsToMedicalRecordTemplates1750710000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      ALTER TABLE "medical_record_templates"
      ADD COLUMN IF NOT EXISTS "sections" JSONB NOT NULL DEFAULT '[]'
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    await queryRunner.query(`
      ALTER TABLE "medical_record_templates"
      DROP COLUMN IF EXISTS "sections"
    `)
  }
}
