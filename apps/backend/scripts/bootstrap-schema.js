const { Client } = require('pg')

// Ensures the target schema exists BEFORE TypeORM runs migrations.
// TypeORM creates its `migrations` control table in the configured schema and
// does NOT create the schema itself — on a fresh database (e.g. RDS, where the
// dev `init.sql` never runs) `migration:run` fails with `schema "<x>" does not exist`.
// (The uuid-ossp extension is auto-created by TypeORM on connect; pg_trgm is
//  created idempotently by the trigram migrations — so only the schema is needed here.)
async function bootstrapSchema() {
  const schema = process.env.DB_SCHEMA ?? 'public'

  // Identifiers can't be parameterized — validate to avoid SQL injection.
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) {
    throw new Error(`Invalid DB_SCHEMA "${schema}" — expected a plain identifier`)
  }

  // RDS enforces TLS (rds.force_ssl). Enable SSL when DB_SSL is set, otherwise
  // default to on in production (RDS) and off locally (docker-compose Postgres).
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
  })

  await client.connect()
  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`)
    console.log(`✓ schema "${schema}" ensured`)
  } finally {
    await client.end()
  }
}

bootstrapSchema().catch((error) => {
  console.error(`Schema bootstrap failed: ${error.message}`)
  process.exit(1)
})
