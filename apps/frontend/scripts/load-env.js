const fs = require('fs')
const path = require('path')

async function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  const NODE_ENV = process.env.NODE_ENV ?? 'development'
  // The SSM path segment is the DEPLOY environment (production), which
  // is distinct from NODE_ENV (always 'production' in optimized prod builds).
  // Falls back to NODE_ENV for local dev.
  const PARAMETER_STORE_ENV = process.env.PARAMETER_STORE_ENV ?? NODE_ENV
  const AWS_REGION = process.env.AWS_REGION ?? 'us-east-1'
  const PARAM_PATH = `/pulso/${PARAMETER_STORE_ENV}/frontend/`

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
    // path has no parameters (protects local `yarn dev`).
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
