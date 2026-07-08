import { MigrationInterface, QueryRunner } from 'typeorm'

export class RenameClinicAssetUrlColumnsToPath1753400000000 implements MigrationInterface {
  name = 'RenameClinicAssetUrlColumnsToPath1753400000000'

  // The bucket is now private and branding is streamed by the backend, so we store the S3 object
  // key (path) instead of a public URL. Rename the columns and strip any stored URL down to the key.
  private readonly columns: Array<[string, string]> = [
    ['logo_url', 'logo_path'],
    ['logo_dark_url', 'logo_dark_path'],
    ['favicon_url', 'favicon_path'],
  ]

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    for (const [from, to] of this.columns) {
      await queryRunner.query(`ALTER TABLE "clinics" RENAME COLUMN "${from}" TO "${to}"`)
      // Strip `scheme://host/` and an optional `uploads/` (local dev) prefix, leaving the object key.
      // Non-URL values (already keys) and NULLs are left untouched by regexp_replace.
      await queryRunner.query(
        `UPDATE "clinics" SET "${to}" = regexp_replace("${to}", '^https?://[^/]+/(uploads/)?', '') WHERE "${to}" IS NOT NULL`,
      )
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema ?? 'public'
    await queryRunner.query(`SET search_path TO "${schema}", public`)

    // Rename back only — the original public URL cannot be reliably reconstructed from the key.
    for (const [from, to] of this.columns) {
      await queryRunner.query(`ALTER TABLE "clinics" RENAME COLUMN "${to}" TO "${from}"`)
    }
  }
}
