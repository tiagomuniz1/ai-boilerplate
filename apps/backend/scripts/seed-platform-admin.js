const { Client } = require('pg')
const { randomUUID } = require('crypto')

// Seeds the first PLATFORM_ADMIN (the backoffice manager). The platform is closed
// (POST /users is not public) and seeds never run in production, so the initial
// admin is bootstrapped with this one-off script — run against the RDS via the
// backend image on the EC2 host (see infra/scripts/seed-platform-admin.sh).
//
// A PLATFORM_ADMIN has clinic_id = NULL; the login use-case allows it to sign in
// without a clinic. The password is provided ALREADY HASHED (bcrypt) so the plain
// text never travels through SSM — ADMIN_PASSWORD_HASH must be a bcrypt hash that
// bcrypt.compare accepts (cost 10, like the rest of the app).
//
// Env: DB_* (from .env.local via dotenv), ADMIN_EMAIL, ADMIN_PASSWORD_HASH,
//      ADMIN_NAME (optional), DB_SCHEMA. Idempotent: skips if the admin exists.
async function seedPlatformAdmin() {
  const email = process.env.ADMIN_EMAIL
  const passwordHash = process.env.ADMIN_PASSWORD_HASH
  const fullName = process.env.ADMIN_NAME ?? 'Platform Admin'
  const schema = process.env.DB_SCHEMA ?? 'public'

  if (!email || !passwordHash) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD_HASH are required')
  }
  if (!/^\$2[aby]\$/.test(passwordHash)) {
    throw new Error('ADMIN_PASSWORD_HASH does not look like a bcrypt hash')
  }
  // Identifiers can't be parameterized — validate to avoid SQL injection.
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) {
    throw new Error(`Invalid DB_SCHEMA "${schema}" — expected a plain identifier`)
  }

  const useSsl = process.env.DB_SSL
    ? process.env.DB_SSL === 'true'
    : process.env.NODE_ENV === 'production'

  const client = new Client({
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASS ?? 'postgres',
    database: process.env.DB_NAME ?? 'app',
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 15000, // fail fast instead of hanging if RDS is unreachable
  })

  await client.connect()
  try {
    const existing = await client.query(
      `SELECT id FROM "${schema}".users WHERE email = $1 AND clinic_id IS NULL AND deleted_at IS NULL`,
      [email],
    )
    if (existing.rowCount > 0) {
      console.log(`✓ platform admin "${email}" already exists — skipping`)
      return
    }

    const id = randomUUID()
    await client.query(
      `INSERT INTO "${schema}".users
         (id, full_name, email, password, role, is_active, clinic_id, version, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'platform_admin', true, NULL, 1, now(), now())`,
      [id, fullName, email, passwordHash],
    )
    console.log(`✓ platform admin created: ${email} (id ${id})`)
  } finally {
    await client.end()
  }
}

seedPlatformAdmin().catch((error) => {
  console.error(`Platform admin seed failed: ${error.message}`)
  process.exit(1)
})
