import { defineConfig } from 'cypress'
import { Client } from 'pg'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{ts,tsx}',
    video: false,
    screenshotOnRunFailure: true,
    env: {
      API_URL: 'http://localhost:3001',
      DB_HOST: 'localhost',
      DB_PORT: 5499,
      DB_USER: 'postgres',
      DB_PASS: 'postgres',
      DB_NAME: 'app',
      DB_SCHEMA: 'dev',
    },
    setupNodeEvents(on, config) {
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.family === 'chromium') {
          launchOptions.args.push('--disable-gpu')
          launchOptions.args.push('--disable-dev-shm-usage')
        }

        if (browser.name === 'electron') {
          launchOptions.args.push('--disable-gpu')
          launchOptions.args.push('--no-sandbox')
          launchOptions.args.push('--disable-dev-shm-usage')
          launchOptions.args.push('--disable-software-rasterizer')
          launchOptions.args.push('--disable-features=VizDisplayCompositor')
        }
        return launchOptions
      })

      // Direct DB access for the handful of E2E cases where no API response
      // exposes what the test needs to assert against (e.g. a prescription's
      // plaintext verification token, or seeding a password-set token to
      // simulate the email a real send would deliver). Never point this at
      // production — it refuses to connect if NODE_ENV says otherwise.
      on('task', {
        async dbQuery({ sql, params }: { sql: string; params?: unknown[] }) {
          if (process.env.NODE_ENV === 'production') {
            throw new Error('cy.task("dbQuery") refused: NODE_ENV is production')
          }

          const client = new Client({
            host: config.env.DB_HOST,
            port: config.env.DB_PORT,
            user: config.env.DB_USER,
            password: config.env.DB_PASS,
            database: config.env.DB_NAME,
            options: `-c search_path=${config.env.DB_SCHEMA}`,
          })

          await client.connect()
          try {
            const result = await client.query(sql, params)
            return result.rows
          } finally {
            await client.end()
          }
        },
      })
    },
  },
})
