const fs = require('fs')
const path = require('path')

async function loadEnv() {
  // Write to <cwd>/.env.local so it matches exactly what main.ts reads
  // (dotenv.config from process.cwd()). In dev, cwd is apps/backend; in the
  // container, cwd is /app — both stay consistent between writer and reader.
  const envPath = path.resolve(process.cwd(), '.env.local')
  const NODE_ENV = process.env.NODE_ENV ?? 'development'
  const AWS_REGION = process.env.AWS_REGION ?? 'us-east-1'
  const PARAM_PATH = `/pulso/${NODE_ENV}/backend/`

  try {
    const { SSMClient, GetParametersByPathCommand } = require('@aws-sdk/client-ssm')
    const client = new SSMClient({ region: AWS_REGION })

    let parameters = []
    let nextToken

    do {
      const command = new GetParametersByPathCommand({
        Path: PARAM_PATH,
        WithDecryption: true,
        Recursive: true,
        NextToken: nextToken,
      })
      const response = await client.send(command)
      parameters = parameters.concat(response.Parameters ?? [])
      nextToken = response.NextToken
    } while (nextToken)

    // Guard: never overwrite an existing .env.local with an empty file when the
    // path has no parameters (e.g. wrong prefix, or the env was never seeded).
    // Protects local `yarn dev` from losing its .env.local.
    if (parameters.length === 0) {
      console.warn(`⚠ No parameters found under ${PARAM_PATH} — keeping existing .env.local (not overwriting).`)
      return
    }

    const lines = parameters.map((p) => {
      const key = p.Name.replace(PARAM_PATH, '').replace(/\//g, '_').toUpperCase()
      return `${key}=${p.Value}`
    })

    fs.writeFileSync(envPath, lines.join('\n'))
    console.log(`✓ .env.local generated with ${lines.length} variables from Parameter Store`)
  } catch (error) {
    if (error.name === 'CredentialsProviderError' || error.code === 'ENOTFOUND') {
      console.warn('⚠ Could not connect to AWS Parameter Store. Using existing .env.local if present.')
    } else {
      console.warn(`⚠ Parameter Store load failed: ${error.message}`)
    }
  }
}

loadEnv()
